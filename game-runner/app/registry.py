"""
@file registry.py
@brief Game registry that loads and serves the static game catalog.
Reads games.json at initialization and indexes games by their ID
for fast lookup. No database needed — the catalog is a flat JSON file
baked into the Docker image.
"""

import json
import os

class GameRegistry:
    """
    @brief Loads the game catalog from games.json and provides lookup methods.

    The registry is read-only after initialization. It holds an in-memory
    dictionary of games keyed by their unique ID string.
    """

    def __init__(self, catalog_path: str = None):
        """
        @brief Initialize the registry by loading the game catalog from disk.
        @param catalog_path Optional path to games.json.
        Defaults to games.json in the project root (one level up from app/).
        """
        if catalog_path is None:
            ## Resolve default path: game-runner/games.json (one directory above app/)
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            catalog_path = os.path.join(base_dir, "games.json")

        with open(catalog_path, "r") as f:
            games_list = json.load(f)
        
        ## Index games by their "id" field O(1) lookup
        self._games = {game["id"]: game for game in games_list}
    
    def get_all_games(self) -> list:
        """
        @brief Return all games in the catalog.
        @return List of game dictionaries.
        """
        return list(self._games.values())
    
    def get_game(self, game_id: str) -> dict | None:
        """
        @brief Look up a single game by its ID.
        @param game_id The unique identifier string (e.g. "snake").
        @return The game dictionary if found, None otherwise.
        """
        return self._games.get(game_id)

## @brief Module-level singleton — shared across the entire app.
## @details Imported by main.py so all routes use the same registry instance.
registry = GameRegistry()