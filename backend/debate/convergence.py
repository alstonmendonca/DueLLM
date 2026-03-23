"""Convergence detection for the debate loop."""


def check_convergence(critic_response: str, keyword: str = "CONVERGED") -> bool:
    """Check whether the critic's response signals convergence.

    The critic is instructed to include the convergence keyword when it has
    no major issues remaining with the builder's solution.

    Args:
        critic_response: The full text of the critic's latest response.
        keyword: The convergence keyword to look for.

    Returns:
        True if the response contains the convergence signal.
    """
    return keyword.upper() in critic_response.upper()
