"""
Defines objective functions for PDE-constrained optimization.
"""
from abc import ABC, abstractmethod
from typing import List, Dict, Any
import numpy as np

# Assuming a forward model solver exists that can return solution fields
# from ..kratos_solver import KratosSolver
from .design_variable import DesignVariable

class ObjectiveFunction(ABC):
    """
    Abstract base class for objective functions.
    The objective function, J, provides a scalar measure of the optimization's goal.
    """
    @abstractmethod
    def compute_value(self, simulated_data: np.ndarray, observed_data: np.ndarray,
                      design_variables: List[DesignVariable]) -> float:
        """
        Computes the scalar value of the objective function.

        Args:
            simulated_data (np.ndarray): Data from the forward model simulation.
            observed_data (np.ndarray): Experimental/target data.
            design_variables (List[DesignVariable]): The current design variables,
                                                     used for regularization.

        Returns:
            float: The scalar objective value.
        """
        pass

    @abstractmethod
    def compute_gradient_wrt_solution(self, simulated_data: np.ndarray, observed_data: np.ndarray) -> np.ndarray:
        """
        Computes the gradient of the objective function with respect to the solution variables (u).
        This is the term J_u in adjoint methods.

        Args:
            simulated_data (np.ndarray): Data from the forward model simulation.
            observed_data (np.ndarray): Experimental/target data.

        Returns:
            np.ndarray: The gradient vector.
        """
        pass


class MisfitObjectiveFunction(ObjectiveFunction):
    """
    A standard L2-norm misfit objective function with optional Tikhonov regularization.

    J(u, p) = 0.5 * ||u_sim - u_obs||^2 + 0.5 * alpha * ||p - p_ref||^2
    """
    def __init__(self, regularization_factor: float = 0.0, reference_variables: List[DesignVariable] = None):
        """
        Initializes the misfit objective function.

        Args:
            regularization_factor (float): The weight (alpha) for the Tikhonov regularization term.
            reference_variables (List[DesignVariable]): The reference parameter values (p_ref).
                                                       If None, regularization is not applied to parameters.
        """
        self.alpha = regularization_factor
        self.reference_params = np.array([v.initial_value for v in reference_variables]) if reference_variables else None

    def compute_value(self, simulated_data: np.ndarray, observed_data: np.ndarray,
                      design_variables: List[DesignVariable]) -> float:
        """
        Computes the L2 norm of the misfit plus a regularization term.
        """
        if simulated_data.shape != observed_data.shape:
            raise ValueError("Simulated and observed data must have the same shape.")

        misfit = 0.5 * np.sum((simulated_data - observed_data)**2)

        regularization = 0.0
        if self.alpha > 0 and self.reference_params is not None:
            current_params = np.array([v.current_value for v in design_variables])
            regularization = 0.5 * self.alpha * np.sum((current_params - self.reference_params)**2)

        return misfit + regularization

    def compute_gradient_wrt_solution(self, simulated_data: np.ndarray, observed_data: np.ndarray) -> np.ndarray:
        """
        Computes the gradient of the L2 misfit term with respect to the simulated solution (u_sim).
        The derivative of 0.5 * (u_sim - u_obs)^2 is (u_sim - u_obs).
        """
        if simulated_data.shape != observed_data.shape:
            raise ValueError("Simulated and observed data must have the same shape.")

        return simulated_data - observed_data 