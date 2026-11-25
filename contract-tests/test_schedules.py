import copy
import importlib.util
import json
import unittest

from test_orderglass import UserError, answers, root, sender

spec = importlib.util.spec_from_file_location("schedules", root / "contracts/orderglass_schedules.py")
contract = importlib.util.module_from_spec(spec)
spec.loader.exec_module(contract)
examples = json.loads((root / "examples/schedules.json").read_text())
owner = "0x" + "1" * 40


class ScheduleTests(unittest.TestCase):
    def setUp(self):
        sender.sender_address = owner
        answers.clear()
        self.case = examples[0]
        self.book = contract.OrderGlassSchedules()
        self.book.open_case("test", json.dumps(self.case["spec"]))

    def matrix(self):
        ops = self.case["spec"]["operations"]
        n = len(self.case["spec"]["states"])
        return {"cells": [
            {"result": value, "quote": ops[index // n]["rule"], "reason": "Explicit transition in the supplied rule."}
            for index, value in enumerate(self.case["vector"])
        ]}

    def record(self):
        return json.loads(self.book.get_case(owner, "test"))

    def test_rehearsal_requires_valid_order_certificate_and_owner(self):
        matrix = self.matrix()
        answers.extend([matrix, copy.deepcopy(matrix)])
        self.book.compare(owner, "test")
        record = self.record()
        self.assertEqual(record["proof"]["rows"][0]["allowed"], ["ABC"])
        with self.assertRaisesRegex(UserError, "ORDER_BLOCKED"):
            self.book.rehearse("test", record["certificate"], 0, "BAC")
        with self.assertRaisesRegex(UserError, "STALE_CERTIFICATE"):
            self.book.rehearse("test", "wrong", 0, "ABC")
        sender.sender_address = "0x" + "2" * 40
        with self.assertRaisesRegex(UserError, "NOT_FOUND"):
            self.book.rehearse("test", record["certificate"], 0, "ABC")
        self.assertEqual(self.record(), record)
        sender.sender_address = owner
        self.book.rehearse("test", record["certificate"], 0, "ABC")
        self.assertEqual(self.record()["rehearsal"]["steps"], ["1", "2", "2"])
        with self.assertRaisesRegex(UserError, "NOT_REHEARSABLE"):
            self.book.rehearse("test", record["certificate"], 0, "ABC")

    def test_disagreement_in_third_operation_rolls_back(self):
        matrix = self.matrix()
        rival = copy.deepcopy(matrix)
        rival["cells"][-1]["result"] = "1"
        answers.extend([matrix, rival])
        before = self.record()
        with self.assertRaisesRegex(UserError, "DISAGREEMENT"):
            self.book.compare(owner, "test")
        self.assertEqual(self.record(), before)
