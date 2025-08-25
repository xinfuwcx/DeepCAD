import KratosMultiphysics as KM
import json
import os
def Factory(settings, model):
    if not isinstance(settings, KM.Parameters):
        raise Exception('expected input shall be a Parameters object, encapsulating a json string')
    return MpcConstraintsProcess(model, settings['Parameters'])
class MpcConstraintsProcess(KM.Process):
    def __init__(self, model, settings):
        super().__init__()
        self.model = model
        self.settings = settings
        self.model_part_name = settings['model_part_name'].GetString()
        self.mapping_file = settings['mapping_file'].GetString()
        self.mapping_data = None
    def ExecuteInitialize(self):
        print('[MPC Process] Loading MPC constraints...')
        try:
            with open(self.mapping_file, 'r') as f:
                self.mapping_data = json.load(f)
            model_part = self.model.GetModelPart(self.model_part_name)
            self._apply_mpc_constraints(model_part)
        except Exception as e:
            print(f'[MPC Process] Error applying constraints: {e}')
    def _apply_mpc_constraints(self, model_part):
        shell_anchor = self.mapping_data.get('shell_anchor', [])
        anchor_solid = self.mapping_data.get('anchor_solid', [])
        print(f'[MPC Process] Applying {len(shell_anchor)} shell-anchor + {len(anchor_solid)} anchor-solid constraints')
        constraint_id = 1
        # Apply shell-anchor constraints
        for constraint in shell_anchor:
            try:
                slave_id = constraint['slave']
                masters = constraint['masters']
                if model_part.HasNode(slave_id):
                    slave_node = model_part.GetNode(slave_id)
                    for dof_name in constraint['dofs']:
                        if hasattr(KM, dof_name):
                            dof_var = getattr(KM, dof_name)
                            constraint_eq = KM.LinearMasterSlaveConstraint(constraint_id)
                            constraint_eq.SetSlaveDoF(slave_node, dof_var)
                            for master_info in masters:
                                master_id = master_info['node']
                                weight = master_info['w']
                                if model_part.HasNode(master_id):
                                    master_node = model_part.GetNode(master_id)
                                    constraint_eq.SetMasterDoF(master_node, dof_var, weight)
                            model_part.AddConstraint(constraint_eq)
                            constraint_id += 1
            except Exception as e:
                print(f'[MPC Process] Error applying shell-anchor constraint: {e}')
        # Apply anchor-solid constraints  
        for constraint in anchor_solid:
            try:
                slave_id = constraint['slave']
                masters = constraint['masters']
                if model_part.HasNode(slave_id):
                    slave_node = model_part.GetNode(slave_id)
                    for dof_name in constraint['dofs']:
                        if hasattr(KM, dof_name):
                            dof_var = getattr(KM, dof_name)
                            constraint_eq = KM.LinearMasterSlaveConstraint(constraint_id)
                            constraint_eq.SetSlaveDoF(slave_node, dof_var)
                            for master_info in masters:
                                master_id = master_info['node']
                                weight = master_info['w']
                                if model_part.HasNode(master_id):
                                    master_node = model_part.GetNode(master_id)
                                    constraint_eq.SetMasterDoF(master_node, dof_var, weight)
                            model_part.AddConstraint(constraint_eq)
                            constraint_id += 1
            except Exception as e:
                print(f'[MPC Process] Error applying anchor-solid constraint: {e}')
        print(f'[MPC Process] Successfully applied {constraint_id-1} MPC constraints')
