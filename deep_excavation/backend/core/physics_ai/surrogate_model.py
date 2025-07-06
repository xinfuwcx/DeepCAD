"""
Defines the interface for surrogate models used for rapid prediction.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any
import numpy as np
import onnxruntime as ort

class SurrogateModel(ABC):
    """
    Abstract base class for surrogate models (or proxy models).
    These models are trained offline to approximate the behavior of the
    high-fidelity physics simulation, but with a much lower computational cost.
    """
    @abstractmethod
    def predict(self, input_data: Dict[str, Any]) -> np.ndarray:
        """
        Makes a prediction using the surrogate model.

        Args:
            input_data (Dict[str, Any]): A dictionary of input parameters for the model.
                                         The structure depends on the specific model.

        Returns:
            np.ndarray: The predicted output from the model.
        """
        pass

    @abstractmethod
    def load_model(self, path: str):
        """
        Loads the surrogate model from a specified path.
        """
        pass


class ONNXSurrogateModel(SurrogateModel):
    """
    A surrogate model implementation that uses the ONNX Runtime for inference.
    """
    def __init__(self, model_path: str = None):
        """
        Initializes the ONNXSurrogateModel.

        Args:
            model_path (str, optional): The path to the .onnx model file.
                                        If provided, the model is loaded upon instantiation.
        """
        self.session = None
        self.input_name = None
        self.output_name = None
        if model_path:
            self.load_model(model_path)

    def load_model(self, path: str):
        """
        Loads an ONNX model into an ONNX Runtime inference session.

        Args:
            path (str): The file path to the .onnx model.
        """
        try:
            self.session = ort.InferenceSession(path)
            # Assuming the model has one input and one output
            self.input_name = self.session.get_inputs()[0].name
            self.output_name = self.session.get_outputs()[0].name
            print(f"ONNX model loaded successfully from {path}")
        except Exception as e:
            print(f"Error loading ONNX model: {e}")
            self.session = None

    def predict(self, input_data: np.ndarray) -> np.ndarray:
        """
        Performs inference using the loaded ONNX model.

        Args:
            input_data (np.ndarray): The input data for the model, as a numpy array.
                                     It's assumed to be pre-processed correctly.

        Returns:
            np.ndarray: The model's prediction.
        """
        if not self.session:
            raise RuntimeError("Model is not loaded. Please load a model before calling predict.")

        # The input to run must be a dictionary mapping input names to numpy arrays
        input_feed = {self.input_name: input_data}
        result = self.session.run([self.output_name], input_feed)
        return result[0] 