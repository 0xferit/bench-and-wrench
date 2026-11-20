import json
from pathlib import Path
import subprocess
import sys
import unittest


ROOT = Path(__file__).resolve().parents[1]
TOOL = ROOT / "plugins/solidity-storage-optimizer/skills/solidity-storage-optimizer/scripts/storage_plan.py"
UINT256_MAX = (1 << 256) - 1

BOUNTY = {
    "fields": [
        {"name": "funder", "bits": 160},
        {"name": "deadline", "bits": 32},
        {"name": "amount", "bits": 40},
        {"name": "generation", "bits": 24},
    ],
    "vacancy": "amount",
    "tombstone": {"sentinel": ["generation"]},
}
ARTICLE = {
    "fields": [
        {"name": "owner", "bits": 160},
        {"name": "withdrawalPermittedAt", "bits": 32},
        {"name": "bounty", "bits": 56},
        {"name": "category", "bits": 8},
    ],
    "vacancy": "bounty",
    "tombstone": {"keep": ["owner"], "clear": ["withdrawalPermittedAt"]},
}


def field(**overrides):
    return {
        "name": "x", "category": "NATIVE_PACKABLE", "domainMax": "255",
        "encodedBitWidth": 8, "discardedBitWidth": 0, "slot": 0, **overrides,
    }


def without(entry, key):
    return {name: value for name, value in entry.items() if name != key}


class StoragePlanTool(unittest.TestCase):
    def run_tool(self, *arguments, stdin=None):
        result = subprocess.run(
            [sys.executable, "-B", str(TOOL), *map(str, arguments)],
            input=stdin, text=True, capture_output=True,
        )
        return (json.loads(result.stdout) if result.stdout.strip() else {}), result.returncode

    def check(self, plan):
        return self.run_tool("check", "-", stdin=json.dumps(plan))

    def layout(self, plan):
        return self.run_tool("layout", "-", stdin=json.dumps(plan))

    def failed_checks(self, out):
        return [entry["check"] for entry in out["checks"] if not entry["pass"]]

    def check_names(self, out):
        return [entry["check"] for entry in out["checks"]]


class WidthTests(StoragePlanTool):
    def test_a_small_domain_needs_one_byte_and_names_the_create_call(self):
        out, code = self.run_tool("width", 255, 0)
        self.assertEqual(code, 0)
        self.assertEqual(out["encodedBitWidth"], 8)
        self.assertIs(out["fits"], True)
        self.assertIn("createCall", out)
        self.assertNotIn("quantWrap", out)

    def test_a_full_range_domain_passes_through_without_a_scheme(self):
        out, code = self.run_tool("width", UINT256_MAX, 0)
        self.assertEqual(code, 0)
        self.assertEqual(out["encodedBitWidth"], 256)
        self.assertNotIn("createCall", out)
        self.assertNotIn("quantWrap", out)
        self.assertIn("note", out)

    def test_a_scheme_wider_than_one_word_is_an_error(self):
        out, code = self.run_tool("width", UINT256_MAX, 8)
        self.assertEqual(code, 1)
        self.assertIn("error", out)

    def test_the_create_call_carries_the_discarded_width_first(self):
        out, code = self.run_tool("width", (1 << 96) - 1, 16)
        self.assertEqual(code, 0)
        self.assertTrue(out["createCall"].startswith("UintQuantizationLib.create(16,"))

    def test_a_negative_domain_maximum_is_an_error(self):
        out, code = self.run_tool("width", -5, 0)
        self.assertEqual(code, 1)
        self.assertIn("error", out)

    def test_a_domain_maximum_that_is_not_a_whole_number_is_an_error_in_json(self):
        out, code = self.run_tool("width", "1e27", 0)
        self.assertEqual(code, 1)
        self.assertIn("error", out)


class PackTests(StoragePlanTool):
    def test_first_fit_decreasing_reaches_the_target(self):
        out, code = self.run_tool("pack", 1, 128, 128)
        self.assertEqual(code, 0)
        self.assertEqual(out["method"], "ffd")
        self.assertEqual(out["slots"], 1)

    def test_exact_search_finds_what_first_fit_misses(self):
        out, code = self.run_tool("pack", 2, 136, 96, 96, 72, 64, 32)
        self.assertEqual(code, 0)
        self.assertEqual(out["method"], "exact")
        self.assertEqual(out["slots"], 2)

    def test_an_impossible_target_is_reported_as_infeasible(self):
        out, code = self.run_tool("pack", 1, 200, 104)
        self.assertEqual(code, 1)
        self.assertEqual(out["method"], "infeasible")

    def test_above_twelve_fields_the_result_is_a_stated_heuristic(self):
        out, code = self.run_tool("pack", 6, 248, 56, 72, 104, 160, 96, 24, 104, 120, 40, 232, 160, 64)
        self.assertEqual(code, 0)
        self.assertEqual(out["method"], "ffdBest")
        self.assertIn("note", out)

    def test_a_width_wider_than_one_word_is_an_error(self):
        out, code = self.run_tool("pack", 2, 264, 8)
        self.assertEqual(code, 1)
        self.assertIn("error", out)

    def test_a_target_below_one_slot_is_an_error(self):
        out, code = self.run_tool("pack", 0, 8)
        self.assertEqual(code, 1)
        self.assertIn("error", out)

    def test_a_width_that_is_not_a_whole_number_of_bytes_is_an_error(self):
        out, code = self.run_tool("pack", 1, 7, 9)
        self.assertEqual(code, 1)
        self.assertIn("error", out)


class CheckTests(StoragePlanTool):
    def test_an_untouched_passthrough_field_is_valid(self):
        out, code = self.check({"targetSlots": 1, "fields": [{
            "name": "addr", "category": "PASSTHROUGH", "originalBitWidth": 160,
            "encodedBitWidth": 160, "discardedBitWidth": 0, "slot": 0,
        }]})
        self.assertEqual(code, 0)
        self.assertIs(out["valid"], True)

    def test_a_target_that_is_not_an_integer_fails(self):
        out, code = self.check({"targetSlots": "abc", "fields": []})
        self.assertEqual(code, 1)
        self.assertIs(out["valid"], False)
        self.assertIn("target_slots_integer", self.check_names(out))

    def test_fields_must_be_a_list(self):
        out, code = self.check({"targetSlots": 1, "fields": {}})
        self.assertEqual(code, 1)
        self.assertIs(out["valid"], False)
        self.assertIn("fields_list_required", self.check_names(out))

    def test_a_field_entry_must_be_an_object(self):
        out, code = self.check({"targetSlots": 1, "fields": [123]})
        self.assertEqual(code, 1)
        self.assertIs(out["valid"], False)
        self.assertIn("field_entry_object", self.check_names(out))

    def test_a_shrunk_passthrough_field_fails(self):
        out, code = self.check({"targetSlots": 1, "fields": [{
            "name": "addr", "category": "PASSTHROUGH", "originalBitWidth": 160,
            "encodedBitWidth": 8, "discardedBitWidth": 0, "slot": 0,
        }]})
        self.assertEqual(code, 1)
        self.assertIs(out["valid"], False)

    def test_a_passthrough_field_must_state_its_original_width(self):
        out, code = self.check({"targetSlots": 1, "fields": [{
            "name": "addr", "category": "PASSTHROUGH",
            "encodedBitWidth": 160, "discardedBitWidth": 0, "slot": 0,
        }]})
        self.assertEqual(code, 1)
        self.assertIs(out["valid"], False)

    def test_a_full_word_passthrough_field_is_valid(self):
        out, code = self.check({"targetSlots": 1, "fields": [{
            "name": "val", "category": "PASSTHROUGH", "originalBitWidth": 256,
            "encodedBitWidth": 256, "discardedBitWidth": 0, "slot": 0,
        }]})
        self.assertEqual(code, 0)
        self.assertIs(out["valid"], True)

    def test_an_identity_field_may_not_discard_bits(self):
        out, code = self.check({"targetSlots": 1, "fields": [
            field(name="key", category="IDENTITY", encodedBitWidth=128, discardedBitWidth=8),
        ]})
        self.assertEqual(code, 1)
        self.assertIs(out["valid"], False)

    def test_a_sized_field_must_state_its_domain_maximum(self):
        out, code = self.check({"targetSlots": 1, "fields": [without(field(encodedBitWidth=64), "domainMax")]})
        self.assertEqual(code, 1)
        self.assertIs(out["valid"], False)
        self.assertIn("domain_max_required", self.check_names(out))

    def test_a_field_without_a_name_fails_as_a_named_check(self):
        out, code = self.check({"targetSlots": 1, "fields": [without(field(), "name")]})
        self.assertEqual(code, 1)
        self.assertIs(out["valid"], False)
        self.assertIn("field_name_required", self.check_names(out))

    def test_a_negative_domain_maximum_fails(self):
        out, code = self.check({"targetSlots": 1, "fields": [field(domainMax="-100", encodedBitWidth=64)]})
        self.assertEqual(code, 1)
        self.assertIs(out["valid"], False)
        self.assertIn("domain_max_non_negative", self.check_names(out))

    def test_a_domain_maximum_that_is_not_an_integer_fails(self):
        out, code = self.check({"targetSlots": 1, "fields": [field(domainMax="abc", encodedBitWidth=64)]})
        self.assertEqual(code, 1)
        self.assertIs(out["valid"], False)
        self.assertIn("domain_max_integer", self.check_names(out))

    def test_a_slot_that_is_not_an_integer_fails(self):
        out, code = self.check({"targetSlots": 1, "fields": [field(slot="abc")]})
        self.assertEqual(code, 1)
        self.assertIs(out["valid"], False)
        self.assertIn("slot_id_invalid", self.check_names(out))

    def test_a_negative_slot_fails(self):
        out, code = self.check({"targetSlots": 1, "fields": [field(slot=-1)]})
        self.assertEqual(code, 1)
        self.assertIs(out["valid"], False)
        self.assertIn("slot_id_invalid", self.check_names(out))

    def test_negative_widths_fail_before_the_scheme_is_computed(self):
        for widths in ({"encodedBitWidth": -8, "discardedBitWidth": 0}, {"encodedBitWidth": 8, "discardedBitWidth": -8}):
            with self.subTest(widths=widths):
                out, code = self.check({"targetSlots": 1, "fields": [field(**widths)]})
                self.assertEqual(code, 1)
                self.assertIs(out["valid"], False)
                self.assertIn("width_non_negative", self.check_names(out))
                self.assertNotIn("scheme_covers_domain", self.check_names(out))

    def test_widths_that_are_not_integers_fail_and_the_slot_is_still_reported(self):
        out, code = self.check({"targetSlots": 1, "fields": [field(encodedBitWidth="abc")]})
        self.assertEqual(code, 1)
        self.assertIs(out["valid"], False)
        self.assertIn("width_integer", self.check_names(out))
        self.assertIn("slot_fits", self.check_names(out))

    def test_slot_numbers_must_be_contiguous(self):
        out, code = self.check({"targetSlots": 3, "fields": [
            field(name="a", encodedBitWidth=128, slot=0),
            field(name="b", encodedBitWidth=128, slot=2),
        ]})
        self.assertEqual(code, 1)
        self.assertIs(out["valid"], False)
        self.assertIn("slots_not_contiguous", self.check_names(out))

    def test_a_slot_over_one_word_fails(self):
        out, code = self.check({"targetSlots": 1, "fields": [
            field(name="a", encodedBitWidth=128),
            field(name="b", encodedBitWidth=136),
        ]})
        self.assertEqual(code, 1)
        self.assertIs(out["valid"], False)

    def test_a_category_outside_the_four_names_fails(self):
        misspelled_identity = field(category="IDENTIY", encodedBitWidth=128, discardedBitWidth=8)
        for entry in (misspelled_identity, without(field(), "category")):
            with self.subTest(category=entry.get("category")):
                out, code = self.check({"targetSlots": 1, "fields": [entry]})
                self.assertEqual(code, 1)
                self.assertIn("category_known", self.failed_checks(out))

    def test_a_number_that_is_not_whole_fails(self):
        cases = (
            ({"domainMax": 255.9}, "domain_max_integer"),
            ({"encodedBitWidth": 8.9}, "width_integer"),
            ({"encodedBitWidth": True}, "width_integer"),
            ({"slot": 0.5}, "slot_id_invalid"),
        )
        for override, failed in cases:
            with self.subTest(override=override):
                out, code = self.check({"targetSlots": 1, "fields": [field(**override)]})
                self.assertEqual(code, 1)
                self.assertIn(failed, self.failed_checks(out))


class LayoutTests(StoragePlanTool):
    def test_layout_assigns_offsets_from_bit_zero(self):
        out, code = self.layout(BOUNTY)
        self.assertEqual(code, 0)
        self.assertEqual([entry["offset"] for entry in out["fields"]], [0, 160, 192, 232])
        self.assertEqual((out["usedBits"], out["spareBits"]), (256, 0))
        self.assertEqual(out["vacancy"]["createCall"], "SlotRecyclingLib.create(192, 40)")
        self.assertEqual(int(out["vacancy"]["mask"], 16), ((1 << 40) - 1) << 192)

    def test_layout_keep_mode_builds_the_clear_mask(self):
        out, code = self.layout(ARTICLE)
        self.assertEqual(code, 0)
        self.assertEqual(
            int(out["tombstone"]["clearMask"], 16),
            (((1 << 56) - 1) << 192) | (((1 << 32) - 1) << 160),
        )
        self.assertEqual(
            out["tombstone"]["clearMaskExpression"],
            "SlotRecyclingLib.bitmask(192, 56) | SlotRecyclingLib.bitmask(160, 32)",
        )

    def test_layout_constant_sentinel_is_the_lowest_bit_outside_the_vacancy_field(self):
        out, code = self.layout({
            "fields": [{"name": "live", "bits": 8}, {"name": "owner", "bits": 160}],
            "vacancy": "live", "tombstone": {"sentinel": []},
        })
        self.assertEqual((code, int(out["tombstone"]["sentinel"], 16)), (0, 1 << 8))

    def assert_rejected(self, plan, failed):
        out, code = self.layout(plan)
        self.assertEqual(code, 1)
        self.assertIs(out["valid"], False)
        self.assertIn(failed, self.failed_checks(out))

    def test_layout_rejects_a_width_that_is_not_a_whole_number_of_bytes(self):
        fields = [{"name": "funder", "bits": 160}, {"name": "amount", "bits": 20}]
        self.assert_rejected({**BOUNTY, "fields": fields, "tombstone": {"keep": ["funder"]}}, "bits_byte_aligned")

    def test_layout_rejects_fields_that_exceed_one_word(self):
        fields = BOUNTY["fields"] + [{"name": "extra", "bits": 8}]
        self.assert_rejected({**BOUNTY, "fields": fields}, "word_fits")

    def test_layout_rejects_a_repeated_field_name(self):
        fields = [{"name": "amount", "bits": 40}, {"name": "amount", "bits": 40}, {"name": "generation", "bits": 24}]
        self.assert_rejected({**BOUNTY, "fields": fields}, "field_name_unique")

    def test_layout_rejects_an_unknown_vacancy_field(self):
        self.assert_rejected({**BOUNTY, "vacancy": "missing"}, "vacancy_field_exists")

    def test_layout_rejects_a_vacancy_entry_that_is_not_a_field_name(self):
        self.assert_rejected({**BOUNTY, "vacancy": ["amount"]}, "vacancy_field_exists")

    def test_layout_rejects_a_vacancy_field_as_wide_as_the_word(self):
        self.assert_rejected(
            {"fields": [{"name": "all", "bits": 256}], "vacancy": "all", "tombstone": {"sentinel": []}},
            "vacancy_width_in_range",
        )

    def test_layout_rejects_keeping_the_vacancy_field_as_tombstone(self):
        self.assert_rejected({**ARTICLE, "tombstone": {"keep": ["bounty"]}}, "tombstone_excludes_vacancy")

    def test_layout_rejects_an_empty_keep_list(self):
        self.assert_rejected({**ARTICLE, "tombstone": {"keep": []}}, "tombstone_keep_nonempty")

    def test_layout_rejects_a_field_both_kept_and_cleared(self):
        self.assert_rejected({**ARTICLE, "tombstone": {"keep": ["owner"], "clear": ["owner"]}}, "tombstone_keep_not_cleared")

    def test_layout_rejects_two_tombstone_modes_at_once(self):
        self.assert_rejected({**ARTICLE, "tombstone": {"keep": ["owner"], "sentinel": []}}, "tombstone_mode_required")

    def test_layout_rejects_a_tombstone_entry_that_is_not_a_list_of_names(self):
        self.assert_rejected({**ARTICLE, "tombstone": {"keep": "owner"}}, "tombstone_names_list")

    def test_layout_clears_a_field_once_however_often_it_is_listed(self):
        expected, _ = self.layout(ARTICLE)
        repeated = {"keep": ["owner"], "clear": ["bounty", "withdrawalPermittedAt", "withdrawalPermittedAt"]}
        out, code = self.layout({**ARTICLE, "tombstone": repeated})
        self.assertEqual(code, 0)
        self.assertEqual(out["tombstone"]["clearMask"], expected["tombstone"]["clearMask"])


if __name__ == "__main__":
    unittest.main()
