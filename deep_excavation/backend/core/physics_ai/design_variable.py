"""
Defines the structure for design variables used in optimization problems.
"""
from typing import List, Dict, Any, Union

class DesignVariable:
    """
    Represents a single design variable in a PDE-constrained optimization problem.

    This class holds information about a parameter that will be adjusted by the
    optimizer, such as its name, initial value, and bounds.
    """
    def __init__(self, name: str, initial_value: float, lower_bound: float, upper_bound: float, target_entity: str = None):
        """
        Initializes a DesignVariable.

        Args:
            name (str): The name of the variable (e.g., 'material_elastic_modulus').
            initial_value (float): The starting value for the optimization.
            lower_bound (float): The minimum allowable value for the variable.
            upper_bound (float): The maximum allowable value for the variable.
            target_entity (str, optional): The specific model entity this variable
                                           applies to (e.g., 'soil_layer_1'). Defaults to None.
        """
        if lower_bound > upper_bound:
            raise ValueError("Lower bound cannot be greater than upper bound.")
        if not (lower_bound <= initial_value <= upper_bound):
            raise ValueError("Initial value must be within bounds.")

        self.name = name
        self.initial_value = initial_value
        self.lower_bound = lower_bound
        self.upper_bound = upper_bound
        self.current_value = initial_value
        self.target_entity = target_entity

    def __repr__(self):
        return (f"DesignVariable(name={self.name}, value={self.current_value}, "
                f"bounds=[{self.lower_bound}, {self.upper_bound}])")

    def to_dict(self) -> Dict[str, Any]:
        """Serializes the design variable to a dictionary."""
        return {
            "name": self.name,
            "initial_value": self.initial_value,
            "lower_bound": self.lower_bound,
            "upper_bound": self.upper_bound,
            "current_value": self.current_value,
            "target_entity": self.target_entity,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'DesignVariable':
        """Creates a DesignVariable instance from a dictionary."""
        return cls(
            name=data['name'],
            initial_value=data['initial_value'],
            lower_bound=data['lower_bound'],
            upper_bound=data['upper_bound']
        ) 