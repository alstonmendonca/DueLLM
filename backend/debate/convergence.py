"""Convergence detection for the debate loop."""


def check_convergence(critic_response: str) -> bool:
    """Check whether the critic's response signals convergence.

    The critic is instructed to include "CONVERGED" when it has
    no major issues remaining with the builder's solution.

    Args:
        critic_response: The full text of the critic's latest response.

    Returns:
        True if the response contains the convergence signal.
    """
    return "CONVERGED" in critic_response.upper()
