import unittest, types, sys, json, copy, importlib.util, functools
from pathlib import Path
class UserError(Exception): pass
class Return:
    def __init__(self, value): self.calldata=value
sender=types.SimpleNamespace(sender_address='0x'+'1'*40)
answers=[]
def write(fn):
    @functools.wraps(fn)
    def atomic(self,*args):
        saved=copy.deepcopy(self.records)
        try: return fn(self,*args)
        except Exception: self.records=saved;raise
    return atomic
def nondet(leader, validator):
    v=leader()
    if not validator(Return(v)): raise UserError('DISAGREEMENT')
    return v
gl=types.SimpleNamespace(Contract=object,message=sender,public=types.SimpleNamespace(write=write,view=lambda f:f),vm=types.SimpleNamespace(UserError=UserError,Return=Return,run_nondet_unsafe=nondet),nondet=types.SimpleNamespace(exec_prompt=lambda *a,**k:answers.pop(0)))
sys.modules['genlayer']=types.SimpleNamespace(gl=gl,TreeMap=dict)
root=Path(__file__).parents[1]
spec=importlib.util.spec_from_file_location('contract',root/'contracts/orderglass.py'); c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
class Tests(unittest.TestCase):
    def setUp(self):
        answers.clear(); sender.sender_address='0x'+'1'*40
        self.p=json.loads((root/'examples/commuting.json').read_text());self.r=c.OrderGlass();self.r.open_case('one',json.dumps(self.p))
    def record(self):return json.loads(self.r.get_case('0x'+'1'*40,'one'))
    def cells(self,vec):return {'cells':[{'result':v,'quote':self.p['operations'][i//4]['rule'],'reason':'The rule explicitly gives this destination.'} for i,v in enumerate(vec)]}
    def assess(self,vec):
        x=self.cells(vec); answers.extend([x,copy.deepcopy(x)]);self.r.compare('0x'+'1'*40,'one')
    def test_safe_rehearsal_bound_to_certificate(self):
        self.assess(['0','1','0','1','1','1','3','3']);r=self.record();self.assertEqual(r['state'],'COMMUTES');self.r.rehearse('one',r['certificate'],2,'BA');self.assertEqual(self.record()['rehearsal']['steps'],['3','1']);self.assertEqual(self.record()['state'],'REHEARSED')
        with self.assertRaisesRegex(UserError,'NOT_COMMUTING'):self.r.rehearse('one',r['certificate'],2,'AB')
    def test_conflict_has_both_paths(self):
        self.assess(['0','1','0','1','0','1','3','3']);r=self.record();self.assertEqual(r['state'],'ORDER_SENSITIVE');self.assertEqual(r['proof']['counterexamples'],['2'])
        with self.assertRaisesRegex(UserError,'NOT_COMMUTING'): self.r.rehearse('one',r['certificate'],2,'AB')
    def test_unknown_blocks_all_rehearsals(self):
        self.assess(['0','1','0','1','UNKNOWN','1','3','3']);self.assertEqual(self.record()['state'],'REVIEW')
    def test_forged_quote_rolls_back(self):
        before=self.record();x=self.cells(['0']*8);x['cells'][0]['quote']='Invented evidence';answers.append(x)
        with self.assertRaisesRegex(UserError,'UNSUPPORTED_QUOTE'):self.r.compare('0x'+'1'*40,'one')
        self.assertEqual(self.record(),before)
    def test_disagreement_on_unused_cell_rolls_back(self):
        x=self.cells(['0']*8);y=copy.deepcopy(x);y['cells'][-1]['result']='1';answers.extend([x,y]);before=self.record()
        with self.assertRaisesRegex(UserError,'DISAGREEMENT'):self.r.compare('0x'+'1'*40,'one')
        self.assertEqual(self.record(),before)
    def test_stale_certificate_and_wrong_owner(self):
        self.assess(['0','1','0','1','1','1','3','3']);before=self.record()
        with self.assertRaisesRegex(UserError,'STALE_CERTIFICATE'):self.r.rehearse('one','wrong',0,'AB')
        self.assertEqual(self.record(),before);sender.sender_address='0x'+'2'*40
        with self.assertRaisesRegex(UserError,'NOT_FOUND'):self.r.rehearse('one',before['certificate'],0,'AB')
    def test_no_common_domain_and_enablement_mismatch(self):
        table=lambda v:[{'result':x} for x in v]
        self.assertEqual(c.prove(table(['BLOCKED','BLOCKED','0','1']),2)['state'],'NO_COMMON_DOMAIN')
        self.assertEqual(c.prove(table(['1','1','BLOCKED','0']),2)['state'],'ORDER_SENSITIVE')
    def test_duplicate_and_input_immutable(self):
        with self.assertRaisesRegex(UserError,'ALREADY_EXISTS'):self.r.open_case('one',json.dumps(self.p))
        self.assertEqual(self.record()['spec'],self.p)
    def test_numeric_model_destinations_rejected(self):
        x=self.cells(['0']*8);x['cells'][0]['result']=0
        with self.assertRaisesRegex(UserError,'INVALID_RESULT'):c.normalize(x,self.p)
if __name__=='__main__':unittest.main()
