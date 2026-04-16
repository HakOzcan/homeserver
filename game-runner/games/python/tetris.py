"""
@file tetris.py
@brief Minimal tetris implementation for the cloud gaming runner.

Reads GAME_WIDTH / GAME_HEIGHT from the environment (set by the SessionManager
when launching the game under Xvfb), renders with pygame,
and consumes keyboard events injected by xdotool via input.py.

Controls:
  LEFT / RIGHT : Move piece
  DOWN         : Soft drop
  UP           : Rotate
  SPACE        : Hard drop
  RETURN       : Restart after game over
"""

import os
import random
import pygame

## @brief Playfield dimensions in cells.
COLS, ROWS = 10, 20

## @brief Target frame rate. Kept modes so MJPEG capture keeps up.
FPS = 30

## @brief Frames between automatic downward steps(gravity mockup).
GRAVITY_FRAMES = 24

## @brief The seven standard tetrominoes, each a list of (row, col) offsets.
SHAPES = {
    "I": [(0, 0), (0, 1), (0, 2), (0, 3)],
    "O": [(0, 0), (0, 1), (1, 0), (1, 1)],
    "T": [(0, 0), (0, 1), (0, 2), (1, 1)],
    "S": [(0, 1), (0, 2), (1, 0), (1, 1)],
    "Z": [(0, 0), (0, 1), (1, 1), (1, 2)],
    "J": [(0, 0), (1, 0), (1, 1), (1, 2)],
    "L": [(0, 2), (1, 0), (1, 1), (1, 2)],
}

## @brief Color per shape id (RGB).
COLORS = {
    "I": (0, 240, 240), "O": (240, 240, 0), "T": (160, 0, 240),
    "S": (0, 240, 0),   "Z": (240, 0, 0),   "J": (0, 0, 240),
    "L": (240, 160, 0),
}

def rotate(cells):
    """
    @brief Rotate a list of (r, c) cells 90 degrees clockwise around origin.
    @param cells Iterable of (row, col) tuples.
    @return New list of rotated cells, normalized to non-negative coords.
    """
    rotated = [(c, -r) for r, c in cells]
    min_r = min(r for r, _ in rotated)
    min_c = min(c for _, c in rotated)
    return [(r - min_r, c - min_c) for r, c in rotated]

class Tetris:
    """
    @brief Encapsulates on Tetris match: board state, active piece, scoring.
    """
    def __init__(self, width, height):
        """
        @param width Window width in pixels.
        @param height Window height in pixels.
        """
        self.width = width
        self.height = height
        self.cell = min(width // (COLS + 6), height // ROWS)
        self.board_px_w = self.cell * COLS
        self.board_px_h = self.cell * ROWS
        self.origin_x = (width - self.board_px_w) // 2
        self.origin_y = (height - self.board_px_h) // 2
        self.reset()
    
    def reset(self):
        """@brief Reset the board and spawn a fresh piece."""
        self.grid = [[None] * COLS for _ in range(ROWS)]
        self.score = 0
        self.game_over = False
        self.gravity = 0
        self._spawn()
    
    def _spawn(self):
        """@brief Spawn a random tetromino at the top-center."""
        self.shape_id = random.choice(list(SHAPES.keys()))
        self.piece = [(r, c + COLS // 2 - 2) for r, c in SHAPES[self.shape_id]]
        if self._collides(self.piece):
            self.game_over = True
    
    def _collides(self, cells):
        """
        @brief Check whether any cell is out of bounds or overlaps locked blocks.
        @param cells Candidate piece cells.
        @return True if the placement is invalid.
        """
        for r, c in cells:
            if c < 0 or c >= COLS or r >= ROWS:
                return True
            if r >= 0 and self.grid[r][c] is not None:
                return True
        return False
    
    def _lock(self):
        """@brief Lock the active piece into the grid and clear full lines."""
        for r, c in self.piece:
            if 0 <= r < ROWS:
                self.grid[r][c] = self.shape_id
        cleared = 0
        new_grid = [row for row in self.grid if any(cell is None for cell in row)]
        cleared = ROWS - len(new_grid)
        for _ in range(cleared):
            new_grid.insert(0, [None] * COLS)
        self.grid = new_grid
        self.score += [0, 100, 300, 500, 800][cleared] if cleared <= 4 else 800
        self._spawn()
    
    def move(self, dr, dc):
        """
        @brief Attempt to move the active piece by (dr, dc).
        @return True if the move succeeded.
        """
        moved = [(r + dr, c + dc) for r, c in self.piece]
        if not self._collides(moved):
            self.piece = moved
            return True
        return False
    
    def rotate_piece(self):
        """@brief Rotate the active piece CW if the result fits."""
        if self.shape_id == "O":
            return
        base_r = min(r for r, _ in self.piece)
        base_c = min(c for _, c in self.piece)
        local = [(r - base_r, c - base_c) for r, c in self.piece]
        rotated = rotate(local)
        candidate = [(r + base_r, c + base_c) for r, c in rotated]
        if not self._collides(candidate):
            self.piece = candidate
    
    def hard_drop(self):
        """@brief Drop the piece to the lowes valid row and lock it."""
        while self.move(1, 0):
            pass
        self._lock()
    
    def step_gravity(self):
        """@brief Advance gravity; lock the piece if it can't fall further."""
        self.gravity += 1
        if self.gravity >= GRAVITY_FRAMES:
            self.gravity = 0
            if not self.move(1, 0):
                self._lock()
    
    def draw(self, surf):
        """
        @brief Render the board, locked blocks, and active piece.
        @param surf Pygame surface to draw onto.
        """
        surf.fill((15, 15, 25))
        pygame.draw.rect(
            surf, (40, 40, 60),
            (self.origin_x, self.origin_y, self.board_px_w, self.board_px_h),
        )
        for r in range(ROWS):
            for c in range(COLS):
                sid = self.grid[r][c]
                if sid is not None:
                    self._draw_cell(surf, r, c, COLORS[sid])
        if not self.game_over:
            for r, c in self.piece:
                if r >= 0:
                    self._draw_cell(surf, r, c, COLORS[self.shape_id])
    
    def _draw_cell(self, surf, r, c, color):
        """@brief Paint a single grid cell at (row, col)."""
        x = self.origin_x + c * self.cell
        y = self.origin_y + r * self.cell
        pygame.draw.rect(surf, color, (x, y, self.cell - 1, self.cell - 1))

def main():
    """@brief Entry point: init pygame, run the game loop until window closes."""
    width = int(os.environ.get("GAME_WIDTH", 800))
    height = int(os.environ.get("GAME_HEIGHT", 600))

    pygame.init()
    screen = pygame.display.set_mode((width, height))
    pygame.display.set_caption("Tetris")
    clock = pygame.time.Clock()
    font = pygame.font.SysFont(None, 32)

    game = Tetris(width, height)
    running = True

    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if game.game_over:
                    if event.key == pygame.K_RETURN:
                        game.reset()
                else:
                    if event.key == pygame.K_LEFT:
                        game.move(0, -1)
                    elif event.key == pygame.K_RIGHT:
                        game.move(0, 1)
                    elif event.key == pygame.K_DOWN:
                        game.move(1, 0)
                    elif event.key == pygame.K_UP:
                        game.rotate_piece()
                    elif event.key == pygame.K_SPACE:
                        game.hard_drop()
        if not game.game_over:
            game.step_gravity()
        
        game.draw(screen)

        score_surf = font.render(f"Score: {game.score}", True, (230, 230, 230))
        screen.blit(score_surf, (20, 20))
        if game.game_over:
            msg = font.render("GAME OVER - press ENTER", True, (255, 80, 80))
            rect = msg.get_rect(center=(width // 2, height // 2))
            screen.blit(msg, rect)
        
        pygame.display.flip()
        clock.tick(FPS)
    
    pygame.quit()

if __name__ == "__main__":
    main()
