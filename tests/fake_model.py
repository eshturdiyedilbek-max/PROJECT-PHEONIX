"""Tiny generated ONNX model that mimics the Slovo sign model's I/O shapes."""

import numpy as np
import onnx
from onnx import TensorProto, helper, numpy_helper


def make_fake_model(path, window: int = 32, num_classes: int = 1001, winner: int = 5) -> str:
    """Write an ONNX model: float32[1,1,3,window,224,224] -> float32[1,num_classes] logits, argmax == winner."""
    path = str(path)
    bias = np.zeros((1, num_classes), dtype=np.float32)
    bias[0, winner] = 20.0  # softmax confidence ~1.0, above default min_confidence
    inp = helper.make_tensor_value_info("input", TensorProto.FLOAT, [1, 1, 3, window, 224, 224])
    out = helper.make_tensor_value_info("logits", TensorProto.FLOAT, [1, num_classes])
    nodes = [
        helper.make_node("ReduceMean", ["input"], ["mean"], keepdims=0),  # scalar
        helper.make_node("Mul", ["mean", "zero"], ["scaled"]),
        helper.make_node("Add", ["scaled", "bias"], ["logits"]),
    ]
    graph = helper.make_graph(
        nodes,
        "fake_sign_model",
        [inp],
        [out],
        initializer=[
            numpy_helper.from_array(np.array(1e-6, dtype=np.float32), "zero"),
            numpy_helper.from_array(bias, "bias"),
        ],
    )
    model = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 17)])
    model.ir_version = 8
    onnx.checker.check_model(model)
    onnx.save(model, path)
    return path
