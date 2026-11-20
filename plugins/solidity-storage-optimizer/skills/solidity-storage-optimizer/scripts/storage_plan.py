"""Arithmetic for planning Solidity storage: quantization widths, slot packing, plan checks and word layouts.

Usage:
    storage_plan.py width <domainMax> <discardedBitWidth>
    storage_plan.py pack <targetSlots> <width> [<width> ...]
    storage_plan.py check <file | ->
    storage_plan.py layout <file | ->

Every subcommand prints one JSON object. Exit status 0 means success, 1 a failed check or invalid input.

width   The smallest byte-aligned encodedBitWidth whose scheme covers domainMax after discarding
        discardedBitWidth low bits, with the matching UintQuantizationLib.create call.
pack    Field widths packed into 256-bit slots: first-fit-decreasing, then an exact search when that
        misses the target and there are at most 12 fields. "infeasible" is a proof; "ffdBest" is not.
check   A packing plan checked field by field and slot by slot. Input:
        {"targetSlots": 1, "fields": [{"name", "category", "domainMax", "encodedBitWidth",
        "discardedBitWidth", "slot"}]}; category is NATIVE_PACKABLE, FULL_RANGE_QUANTIZABLE,
        IDENTITY or PASSTHROUGH, nothing else, and a PASSTHROUGH field states "originalBitWidth" instead
        of "domainMax". Numbers are integers or strings of decimal digits.
layout  One recycled record laid out in a single word: offsets, masks, the SlotRecyclingLib.create
        call for the vacancy field and the tombstone. Input, fields listed from bit 0 upward:
        {"fields": [{"name", "bits"}], "vacancy": <field name>, "tombstone": <one of the two below>}
        {"keep": [fields that stay and are non-zero in every live record], "clear": [further fields to zero]}
        {"sentinel": [fields whose values the sentinel word carries; empty for a constant sentinel]}
"""

import argparse
import json
import sys


WORD_BITS = 256
BYTE_BITS = 8
EXACT_SEARCH_FIELD_LIMIT = 12
VACANCY_MIN_BITS = 8
VACANCY_MAX_BITS = 248
FIELD_CATEGORIES = ("NATIVE_PACKABLE", "FULL_RANGE_QUANTIZABLE", "IDENTITY", "PASSTHROUGH")
BITS_PER_HEX_DIGIT = 4
HEX_DIGITS_PER_WORD = WORD_BITS // BITS_PER_HEX_DIGIT


def round_up_to_byte(bits):
    return -(-bits // BYTE_BITS) * BYTE_BITS


def is_byte_aligned(bits):
    return bits % BYTE_BITS == 0


def bit_mask(offset, bits):
    return ((1 << bits) - 1) << offset


def scheme_max(encoded_bits, discarded_bits):
    return bit_mask(discarded_bits, encoded_bits)


def plan_width(domain_max, discarded_bits):
    if discarded_bits < 0:
        return {"error": "discardedBitWidth must be >= 0"}
    if not is_byte_aligned(discarded_bits):
        return {"error": f"discardedBitWidth={discarded_bits} is not a multiple of {BYTE_BITS}"}
    if domain_max <= 0:
        return {"error": "domainMax must be > 0"}
    step = 1 << discarded_bits
    largest_encoded = -(-domain_max // step)
    encoded_bits = round_up_to_byte(largest_encoded.bit_length())
    if discarded_bits + encoded_bits > WORD_BITS:
        return {
            "error": f"discardedBitWidth({discarded_bits}) + encodedBitWidth({encoded_bits}) exceeds {WORD_BITS}",
            "encodedBitWidth": encoded_bits,
        }
    covered = scheme_max(encoded_bits, discarded_bits)
    result = {
        "domainMax": str(domain_max),
        "discardedBitWidth": discarded_bits,
        "encodedBitWidth": encoded_bits,
        "stepSize": str(step),
        "schemeMax": str(covered),
        "fits": covered >= domain_max,
    }
    if encoded_bits == WORD_BITS:
        result["note"] = "Full-width field: it needs no quantization scheme."
    else:
        result["createCall"] = f"UintQuantizationLib.create({discarded_bits}, {encoded_bits})"
    return result


def first_fit_decreasing(widths):
    slots = []
    for index in sorted(range(len(widths)), key=lambda position: -widths[position]):
        home = next((slot for slot in slots if slot["used"] + widths[index] <= WORD_BITS), None)
        if home is None:
            home = {"used": 0, "fields": []}
            slots.append(home)
        home["used"] += widths[index]
        home["fields"].append(index)
    return [slot["fields"] for slot in slots]


def exact_pack(widths, target):
    order = sorted(range(len(widths)), key=lambda position: -widths[position])
    used = [0] * target
    fields = [[] for _ in range(target)]

    def place(position):
        if position == len(order):
            return True
        index = order[position]
        tried = set()
        for slot in range(target):
            if used[slot] + widths[index] > WORD_BITS or used[slot] in tried:
                continue
            tried.add(used[slot])
            used[slot] += widths[index]
            fields[slot].append(index)
            if place(position + 1):
                return True
            used[slot] -= widths[index]
            fields[slot].pop()
        return False

    return [slot for slot in fields if slot] if place(0) else None


def spare_bits(widths, assignments):
    return [WORD_BITS - sum(widths[index] for index in slot) for slot in assignments]


def plan_pack(target, widths):
    if target < 1:
        return {"error": "targetSlots must be >= 1"}
    unplaceable = [width for width in widths if not 0 < width <= WORD_BITS or not is_byte_aligned(width)]
    if unplaceable:
        return {"error": f"every width must be a whole number of bytes, from {BYTE_BITS} to {WORD_BITS} bits; got {unplaceable}"}
    greedy = first_fit_decreasing(widths)
    if len(greedy) <= target:
        return {"method": "ffd", "slots": len(greedy), "assignments": greedy, "sparePerSlot": spare_bits(widths, greedy)}
    if len(widths) > EXACT_SEARCH_FIELD_LIMIT:
        return {
            "method": "ffdBest", "ffdSlots": len(greedy), "target": target,
            "assignments": greedy, "sparePerSlot": spare_bits(widths, greedy),
            "note": f"More than {EXACT_SEARCH_FIELD_LIMIT} fields: exact search skipped, so this is not a proof that the target is infeasible.",
        }
    exact = exact_pack(widths, target)
    if exact is None:
        return {"method": "infeasible", "ffdSlots": len(greedy), "target": target}
    return {"method": "exact", "slots": len(exact), "assignments": exact, "sparePerSlot": spare_bits(widths, exact)}


def as_integer(value):
    """Return a whole number given as an integer or as decimal digits, or None for anything else."""
    is_whole_number = isinstance(value, int) and not isinstance(value, bool)
    is_digit_string = isinstance(value, str) and value.removeprefix("-").isdecimal()
    return int(value) if is_whole_number or is_digit_string else None


class Checks:
    def __init__(self):
        self.entries = []

    def record(self, check, passed, **details):
        self.entries.append({"check": check, **details, "pass": passed})
        return passed

    def fail(self, check, error, **details):
        self.record(check, False, error=error, **details)

    def report(self, **extra):
        return {"valid": all(entry["pass"] for entry in self.entries), "checks": self.entries, **extra}


def check_field_widths(checks, entry, name):
    encoded = as_integer(entry.get("encodedBitWidth", 0))
    discarded = as_integer(entry.get("discardedBitWidth", 0))
    if encoded is None or discarded is None:
        checks.fail("width_integer", "encodedBitWidth and discardedBitWidth must be integers", field=name)
        return None
    if encoded < 0 or discarded < 0:
        checks.fail("width_non_negative", "encodedBitWidth and discardedBitWidth must be non-negative", field=name)
        return None
    checks.record("total_width_le_256", discarded + encoded <= WORD_BITS, field=name, value=discarded + encoded)
    full_width = encoded == WORD_BITS and discarded == 0
    checks.record("encoded_in_range", full_width or 0 < encoded < WORD_BITS, field=name, value=encoded)
    checks.record(
        "byte_aligned", is_byte_aligned(discarded) and is_byte_aligned(encoded),
        field=name, discarded=discarded, encoded=encoded,
    )
    return encoded, discarded


def check_field_domain(checks, entry, name, encoded, discarded):
    if "domainMax" not in entry:
        checks.fail("domain_max_required", "domainMax required for every field that is not PASSTHROUGH", field=name)
        return
    domain_max = as_integer(entry["domainMax"])
    if domain_max is None:
        checks.fail("domain_max_integer", f"domainMax must be an integer, got {entry['domainMax']!r}", field=name)
    elif domain_max < 0:
        checks.fail("domain_max_non_negative", f"domainMax must be non-negative, got {domain_max}", field=name)
    else:
        covered = scheme_max(encoded, discarded)
        checks.record(
            "scheme_covers_domain", covered >= domain_max,
            field=name, schemeMax=str(covered), domainMax=str(domain_max),
        )


def check_passthrough(checks, entry, name, encoded, discarded):
    original = as_integer(entry.get("originalBitWidth"))
    if original is None:
        checks.fail(
            "passthrough_unmodified",
            "PASSTHROUGH field needs originalBitWidth as a whole number (address 160, bool 8, bytesN N*8)", field=name,
        )
        return
    checks.record(
        "passthrough_unmodified", encoded == original and discarded == 0,
        field=name, originalBitWidth=original, encodedBitWidth=encoded, discardedBitWidth=discarded,
    )


def check_field(checks, entry):
    """Record the field's checks and return the bits it stores, 0 when they cannot be determined."""
    name = entry.get("name")
    if name is None:
        checks.fail("field_name_required", "field is missing its name", field="?")
        return 0
    widths = check_field_widths(checks, entry, name)
    if widths is None:
        return 0
    encoded, discarded = widths
    category = entry.get("category")
    if not checks.record("category_known", category in FIELD_CATEGORIES, field=name, category=category):
        return encoded
    if category == "PASSTHROUGH":
        check_passthrough(checks, entry, name, encoded, discarded)
    else:
        check_field_domain(checks, entry, name, encoded, discarded)
    if category == "IDENTITY":
        checks.record("identity_no_discard", discarded == 0, field=name, discardedBitWidth=discarded)
    return encoded


def check_plan(plan):
    checks = Checks()
    if not isinstance(plan, dict):
        checks.fail("config_object_required", "the plan must be a JSON object")
        return checks.report()
    target = as_integer(plan.get("targetSlots", 1))
    if target is None:
        checks.fail("target_slots_integer", f"targetSlots must be an integer, got {plan.get('targetSlots')!r}")
    elif target < 0:
        checks.fail("target_slots_non_negative", f"targetSlots must be non-negative, got {target}")
    fields = plan.get("fields", [])
    if not isinstance(fields, list):
        checks.fail("fields_list_required", "fields must be a list")
        return checks.report()

    slots = {}
    for entry in fields:
        if not isinstance(entry, dict):
            checks.fail("field_entry_object", "field entries must be objects", field="?")
            continue
        stored_bits = check_field(checks, entry)
        name = entry.get("name") or "?"
        slot = as_integer(entry.get("slot", 0))
        if slot is None or slot < 0:
            checks.fail("slot_id_invalid", f"slot must be a non-negative integer, got {entry.get('slot')!r}", field=name)
        else:
            slots.setdefault(slot, []).append((name, stored_bits))

    for slot, members in sorted(slots.items()):
        total = sum(stored_bits for _, stored_bits in members)
        checks.record(
            "slot_fits", total <= WORD_BITS, slot=slot, totalBits=total, spare=WORD_BITS - total,
            fields=[name for name, _ in members],
        )
    slot_count = max(slots) + 1 if slots else 0
    missing = sorted(set(range(slot_count)) - set(slots))
    if missing:
        checks.fail("slots_not_contiguous", "slot numbers must run from 0 without gaps", missingSlots=missing)
    if target is not None and target >= 0:
        checks.record("slot_count", slot_count <= target, actual=slot_count, target=target)
    return checks.report()


def word_hex(value):
    return f"0x{value:0{HEX_DIGITS_PER_WORD}x}"


def place_fields(checks, entries):
    """Return the fields with their offsets, or None when an entry cannot be placed."""
    placed, offset = [], 0
    for entry in entries:
        if not isinstance(entry, dict):
            checks.fail("field_entry_object", "field entries must be objects", field="?")
            return None
        name, bits = entry.get("name"), entry.get("bits")
        if not isinstance(name, str) or not name:
            checks.fail("field_name_required", "field is missing its name", field="?")
            return None
        if not isinstance(bits, int) or isinstance(bits, bool):
            checks.fail("bits_integer", f"bits must be an integer, got {bits!r}", field=name)
            return None
        if not checks.record("bits_byte_aligned", bits > 0 and is_byte_aligned(bits), field=name, bits=bits):
            return None
        placed.append({"name": name, "offset": offset, "bits": bits, "mask": word_hex(bit_mask(offset, bits))})
        offset += bits
    names = [field["name"] for field in placed]
    repeated = sorted({name for name in names if names.count(name) > 1})
    checks.record("field_name_unique", not repeated, repeated=repeated)
    checks.record("word_fits", offset <= WORD_BITS, usedBits=offset)
    return None if repeated or offset > WORD_BITS else placed


def named_fields(checks, by_name, names, vacancy):
    """Return the named fields, or None when a name is unknown or is the vacancy field."""
    unknown = [name for name in names if name not in by_name]
    known = checks.record("tombstone_field_exists", not unknown, unknown=unknown)
    separate = checks.record("tombstone_excludes_vacancy", vacancy["name"] not in names)
    return [by_name[name] for name in names] if known and separate else None


def is_name_list(value):
    return isinstance(value, list) and all(isinstance(name, str) for name in value)


def without_repeats(names):
    return list(dict.fromkeys(names))


def plan_tombstone(checks, by_name, vacancy, tombstone):
    modes = [mode for mode in ("keep", "sentinel") if isinstance(tombstone, dict) and mode in tombstone]
    if not checks.record("tombstone_mode_required", len(modes) == 1, given=modes):
        return None
    mode = modes[0]
    if not checks.record("tombstone_names_list", is_name_list(tombstone[mode]) and is_name_list(tombstone.get("clear", []))):
        return None
    if mode == "sentinel":
        carried = named_fields(checks, by_name, without_repeats(tombstone["sentinel"]), vacancy)
        if carried is None:
            return None
        plan = {"mode": "sentinel", "fields": [{key: field[key] for key in ("name", "offset", "bits")} for field in carried]}
        if not carried:
            lowest_free_bit = 0 if vacancy["offset"] > 0 else vacancy["bits"]
            plan["sentinel"] = word_hex(1 << lowest_free_bit)
        return plan
    kept = without_repeats(tombstone["keep"])
    cleared = [name for name in without_repeats(tombstone.get("clear", [])) if name != vacancy["name"]]
    nonempty = checks.record("tombstone_keep_nonempty", bool(kept))
    disjoint = checks.record("tombstone_keep_not_cleared", not set(kept) & set(cleared))
    if named_fields(checks, by_name, kept + cleared, vacancy) is None or not (nonempty and disjoint):
        return None
    zeroed = [vacancy] + [by_name[name] for name in cleared]
    clear_mask = 0
    for field in zeroed:
        clear_mask |= bit_mask(field["offset"], field["bits"])
    return {
        "mode": "keep",
        "kept": kept,
        "clearMask": word_hex(clear_mask),
        "clearMaskExpression": " | ".join(f"SlotRecyclingLib.bitmask({field['offset']}, {field['bits']})" for field in zeroed),
    }


def plan_layout(plan):
    checks = Checks()
    if not isinstance(plan, dict) or not isinstance(plan.get("fields"), list) or not plan["fields"]:
        checks.fail("fields_list_required", "the plan needs a non-empty list of fields")
        return checks.report()
    placed = place_fields(checks, plan["fields"])
    if placed is None:
        return checks.report()
    used = sum(field["bits"] for field in placed)
    layout = {"usedBits": used, "spareBits": WORD_BITS - used, "fields": placed}
    by_name = {field["name"]: field for field in placed}
    named = plan.get("vacancy")
    vacancy = by_name.get(named) if isinstance(named, str) else None
    if not checks.record("vacancy_field_exists", vacancy is not None, vacancy=named):
        return checks.report(**layout)
    in_range = checks.record(
        "vacancy_width_in_range", VACANCY_MIN_BITS <= vacancy["bits"] <= VACANCY_MAX_BITS,
        bits=vacancy["bits"], minimum=VACANCY_MIN_BITS, maximum=VACANCY_MAX_BITS,
    )
    if not in_range:
        return checks.report(**layout)
    layout["vacancy"] = {
        "field": vacancy["name"], "offset": vacancy["offset"], "bits": vacancy["bits"], "mask": vacancy["mask"],
        "createCall": f"SlotRecyclingLib.create({vacancy['offset']}, {vacancy['bits']})",
    }
    tombstone = plan_tombstone(checks, by_name, vacancy, plan.get("tombstone"))
    if tombstone is not None:
        layout["tombstone"] = tombstone
    return checks.report(**layout)


def read_plan(source):
    if source == "-":
        return json.load(sys.stdin)
    with open(source) as handle:
        return json.load(handle)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    commands = parser.add_subparsers(dest="command", required=True)
    width = commands.add_parser("width")
    width.add_argument("domain_max")
    width.add_argument("discarded_bits")
    pack = commands.add_parser("pack")
    pack.add_argument("target")
    pack.add_argument("widths", nargs="+")
    plan_readers = {"check": check_plan, "layout": plan_layout}
    for name in plan_readers:
        commands.add_parser(name).add_argument("plan")
    arguments = parser.parse_args()

    if arguments.command in ("width", "pack"):
        given = [arguments.domain_max, arguments.discarded_bits] if arguments.command == "width" else [arguments.target, *arguments.widths]
        numbers = [as_integer(value) for value in given]
        if None in numbers:
            result = {"error": f"every argument must be a whole number, got {given}"}
        elif arguments.command == "width":
            result = plan_width(*numbers)
        else:
            result = plan_pack(numbers[0], numbers[1:])
    else:
        try:
            plan = read_plan(arguments.plan)
        except (OSError, ValueError) as error:
            result = {"error": f"cannot read the plan: {error}"}
        else:
            result = plan_readers[arguments.command](plan)
    print(json.dumps(result, indent=2))
    failed = "error" in result or result.get("valid") is False or result.get("method") == "infeasible"
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
