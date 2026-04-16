"""
@file minesweeper.py
@brief Classic Minesweeper for the cloud gaming runner.

Reads GAME_WIDTH / GAME_HEIGHT from environment. Renders with pygame.

Controls:
  LEFT CLICK   : Reveal cell
  RIGHT CLICK  : Toggle flag
  RETURN       : Restart after win / game over
"""

import os
import random
import pygame


## @brief Grid size and mine count.
GRID_COLS, GRID_ROWS = 16, 16
MINE_COUNT = 40

## @brief Target frame rate. Low since the scene is mostly static.
FPS = 15

## @brief Color palette.
BG_COLOR = (15, 15, 25)
CELL_HIDDEN = (60, 60, 80)
CELL_REVEALED = (30, 30, 45)
CELL_MINE = (220, 50, 50)
CELL_FLAG = (240, 200, 50)
GRID_LINE = (40, 40, 55)
TEXT_COLOR = (210, 210, 220)

## @brief Neighbor-count digit colors(1-8)
NUMBER_COLORS = {
    1: (100, 150, 255),
    2: (80, 200, 80),
    3: (240, 80, 80),
    4: (140, 80, 220),
    5: (200, 120, 50),
    6: (60, 200, 200),
    7: (180, 180, 180),
    8: (220, 220, 220),
}

class Minesweeper:
    """@brief Encapsulates one Minesweeper match: grid state, reveal/flag logic."""
    
    def __init__(self, width, height):
        """
        @param width Window width in pixels.
        @param height Window height in pixels.
        """
        self.width = width
        self.height = height
        self.cell = min(width // GRID_COLS, (height - 50) // GRID_ROWS)
        self.board_w = self.cell * GRID_COLS
        self.board_h = self.cell * GRID_ROWS
        self.origin_x = (widht - self.board_w) // 2
        self.origin_y = (height - self.board_h + 30) // 2
        self.reset()

    def reset(self):
        """@brief Reset the board: place mines, compute neighbor counts."""
        self.revealed = [[False] * GRID_COLS for _ in range(GRID_ROWS)]
        self.flagged = [[False] * GRID_COLS for _ in range(GRID_ROWS)]
        self.mines = [[False] * GRID_COLS for _ in range(GRID_ROWS)]
        self.counts = [[0] * GRID_COLS for _ in range(GRID_ROWS)]
        self.game_over = False
        self.won = False
        self.first_click = True

    def _place_mines(self, safe_r, safe_c):
        """
        @brief Place mines randomly, keeping a 3x3 safe zone aound the first click.
        @param safe_r Row of the first click.
        @param safe_c Column of the first click.
        """
        safe = set()
        for dr in range(-1, 2):
            for dc in range(-1, 2):
                safe.add(((safe_r + dr, safe_c + dc)))
        
        candidates = [
            (r, c)
            for r in range(GRID_ROWS)
            for c in range(GRID_COLS)
            if (r, c) not in safe
        ]
        chosen = random.sample(candidates, min(MINE_COUNT, len(candidates)))
        for r, c in chosen:
            self.mines[r][c] = True
        for r in range(GRID_ROWS):
            for c in range(GRID_COLS):
                if not self.mines[r][c]:
                    self.counts[r][c] = sum(
                        1
                        for nr, nc in self._neighbors(r, c)
                        if self.mines[nr][nc]
                    )
    
    def _neighbors(self, r, c):
        """
        @brief Yield valid neighbor coordinates for cell (r, c).
        @return Generator of (row, col) tuples.
        """
        for dr in range(-1 ,2):
            for dc in range(-1, 2):
                if dr == 0 and dc == 0:
                    continue
                nr, nc = r + dr, c + dc
                if 0 <= nr < GRID_ROWS and 0 <= nc < GRID_COLS:
                    yield nr, nc
    
    def reveal(self, r, c):
        """
        @brief Reveal a cell. Flood-fills on empty cells, triggers game over on mines.
        @param r Row index.
        @param c Column index.
        """
        if self.game_over or self.won:
            return
        if self.flagged[r][c] or self.revealed[r][c]:
            return
        
        if self.first_click:
            self.first_click = False
            self._place_mines(r, c)

        if self.mines[r][c]:
            self.game_over = True
            self._reveal_all_mines()
            return
        
        self._flood_reveal(r, c)
        self._check_win()
    
    def _flood_reveal(self, r, c):
        """@brief BFS flood-fill reveal starting from (r, c)."""
        stack = [(r, c)]
        while stack:
            cr, cc = stack.pop()
            if self.revealed[cr][cc]:
                continue
            self.revealed[cr][cc] = True
            if self.counts[cr][cc] == 0:
                for nr, nc in self._neighbors(cr, cc):
                    if not self.revealed[nr][nc] and not self.mines[nr][nc]:
                        stack.append((nr, nc))
    
    def _reveal_all_mines(self):
        """@brief Show all mine positions on game over."""
        for r in range(GRID_ROWS):
            for c in range(GRID_COLS):
                if self.mines[r][c]:
                    self.revealed[r][c] = True
    
    def toggle_flag(self, r, c):
        """
        @brief Toggle flag on a hidden cell.
        @param r Row index.
        @param c Column index.
        """
        if self.game_over or self.won:
            return
        if not self.revealed[r][c]:
            self.flagged[r][c] = not self.flagged[r][c]
    
    def _check_win(self):
        """@brief Check if all non-mine cells are revealed."""
        for r in range(GRID_ROWS):
            for c in range(GRID_COLS):
                if not self.mines[r][c] and not self.revealed[r][c]:
                    return
        self.won = True
    
    def pixel_to_cell(self, px, py):
        """
        @brief Conver all pixel coordinates to grid cell indices.
        @param px Pixel x (from mouse event).
        @param py Pixel y (from mouse event).
        @return (row, col) tuple, or None if outside the board.
        """
        c = (px - self.origin_x) // self.cell
        r = (py - self.origin_y) // self.cell
        if 0 <= r < GRID_ROWS and 0 <= c < GRID_COLS:
            return r, c
        return None
    
    def draw(self, surf, font):
        """
        @brief Render the board: hidden cells, revealed cells, flags, mines, numbers.
        @param surf Pygame surface.
        @param font Pygame font for digit rendering.
        """
        surf.fill(BG_COLOR)

        for r in range(GRID_ROWS):
            for c in range(GRID_COLS):
                x = self.origin_x + c * self.cell
                y = self.origin_y + r * self.cell
                rect = pygame.Rect(x, y, self.cell - 1, self.cell - 1)

                if self .revealed[r][c]:
                    if self.mines[r][c]:
                        pygame.draw.rect(surf, CELL_MINE, rect)
                    else:
                        pygame.draw.rect(surf, CELL_REVEALED, rect)
                        if self.counts[r][c] > 0:
                            color = NUMBER_COLORS.get(self.counts[r][c], TEXT_COLOR)
                            txt = font.render(str(self.counts[r][c]), True, color)
                            txt_rect = txt.get_rect(center=rect.center)
                            surf.blit(txt, txt_rect)
                else:
                    pygame.draw.rect(surf, CELL_HIDDEN, rect)
                    if self.flagged[r][c]:
                        flag_txt = font.render("F", True, CELL_FLAG)
                        flag_rect = flag_txt.get_rect(center=rect.center)
                        surf.blit(flag_txt, flag_rect)

def main():
    """@brief Entry point: init pygame, run the game loop."""
    width = int(os.environ.get("GAME_WIDTH", 800))
    height = int(os.environ.get("GAME_HEIGHT", 600))

    pygame.init()
    screen = pygame.display.set_mode((width, height))
    pygame.display.set_caption("Minesweeper")
    clock = pygame.time.Clock()
    game = Minesweeper(width, height)
    font = pygame.font.SysFont(None, max(game.cell - 4, 14))
    msg_font = pygame.font.SysFont(None, 36)
    running = True

    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if (game.game_over or game.won) and event.key == pygame.K_RETURN:
                    game.reset()
            elif event.type == pygame.MOUSEBUTTONDOWN:
                cell = game.pixel_to_cell(event.pos[0], event.pos[1])
                if cell:
                    r, c = cell
                    if event.button == 1:
                        game.reveal(r, c)
                    elif event.button == 3:
                        game.toggle_flag(r, c)

        game.draw(screen, font)

        if game.game_over:
            msg = msg_font.render("GAME OVER - press ENTER", True, (255, 80, 80))
            rect = msg.get_rect(center=(width // 2, game.origin_y - 20))
            screen.blit(msg, rect)
        elif game.won:
            msg = msg_font.render("YOU WIN! - press ENTER", True, (80, 255, 120))
            rect = msg.get_rect(center=(width // 2, game.origin_y - 20))
            screen.blit(msg, rect)

        pygame.display.flip()
        clock.tick(FPS)

    pygame.quit()

if __name__ == "__main__":
    main()