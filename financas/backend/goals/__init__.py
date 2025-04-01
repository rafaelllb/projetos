# /backend/goals/__init__.py
from goals.models import Goal, GoalContribution
from goals.controllers import (
    create_goal, get_goal, get_user_goals, update_goal,
    delete_goal, add_goal_contribution, get_goal_contributions,
    calculate_goal_progress
)

__all__ = [
    'Goal', 'GoalContribution',
    'create_goal', 'get_goal', 'get_user_goals', 'update_goal',
    'delete_goal', 'add_goal_contribution', 'get_goal_contributions',
    'calculate_goal_progress'
]
