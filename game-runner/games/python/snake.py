"""
@file snake.py
@brief Classic Snake game built with pygame.

Runs inside the game-runner container on a virtual X11 display.
Resolution is read from environment variables set by the session manager.
FFmpeg captures the display output and streams it as JPEG frames,
while xdotool injects keyboard events from the browser.
"""

import os
import sys
import random
import pygame

# Read resolution from environment (set by session.py when launching the game)
WIDTH = int(os.environ.get("GAME_WIDTH", 800))
HEIGHT = int(os.environ.get("GAME_HEIGHT", 600))
CELL_SIZE = 20
FPS = 12

## Colors - dark theme to match the frontend aesthetic
BG_COLOR = (15, 15, 25)
GRID_COLOR = (25, 25, 40)
SNAKE_COLOR = (52, 211, 153)
SNAKE_HEAD_COLOR = (16, 185, 129)
FOOD_COLOR = (248, 113, 113)
TEXT_COLOR = (255, 255, 255)
SCORE_COLOR = (167, 139, 250)

## Direction vectors - (dx, dy) added to head position each tick
UP = (0, -1)
DOWN = (0, 1)
LEFT = (-1, 0)
RIGHT = (1, 0)

def main():
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Snake")
    clock = pygame.time.Clock()
    font = pygame.font.Font(None, 36)
    big_font = pygame.font.Font(None, 64)

    ## Grid dimensions in cells (not pixels)
    cols = WIDTH // CELL_SIZE
    rows = HEIGHT // CELL_SIZE

    def reset_game():
        """@brief Reset all game state for a new round."""
        start_x = cols // 2
        start_y = rows // 2
        snake = [(start_x, start_y), (start_x - 1, start_y), (start_x - 2, start_y)]
        direction = RIGHT
        food = spawn_food(snake)
        score = 0
        return snake, direction, food, score
    
    def spawn_food(snake):
        """@brief Place food on a random cell not occupied by the snake."""
        while True:
            pos = (random.randint(0, cols - 1), random.randint(0, rows - 1))
            if pos not in snake:
                return pos
    
    def draw_grid():
        """@brief Draw subtle grid lines for visual reference."""
        for x in range(0, WIDTH, CELL_SIZE):
            pygame.draw.line(screen, GRID_COLOR, (x, 0), (x, HEIGHT))
        for y in range(0, HEIGHT, CELL_SIZE):
            pygame.draw.line(screen, GRID_COLOR, (0, y), (WIDTH, y))
    
    snake, direction, food, score = reset_game()
    game_over = False

    running = True
    while running:
        ## Process input events (injected by xdotool from browser keypresses)
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if game_over:
                    if event.key == pygame.K_SPACE or event.key == pygame.K_RETURN:
                        snake, direction, food, score = reset_game()
                        game_over = False
                else:
                    ## Prevent 180 degree turns as it cannot go directly opposite
                    if event.key == pygame.K_UP and direction != DOWN:
                        direction = UP
                    elif event.key == pygame.K_DOWN and direction != UP:
                        direction = DOWN
                    elif event.key == pygame.K_LEFT and direction != RIGHT:
                        direction = LEFT
                    elif event.key == pygame.K_RIGHT and direction != LEFT:
                        direction = RIGHT
        
        if not game_over:
            ## Move snake by adding new head in current direction
            head_x, head_y = snake[0]
            new_head = (head_x + direction[0], head_y + direction[1])

            ## Check wall collision
            if new_head[0] < 0 or new_head[0] >= cols or new_head[1] < 0 or new_head[1] >= rows:
                game_over = True
            ## Check collision with tail
            elif new_head in snake:
                game_over = True
            else:
                snake.insert(0, new_head)
                if new_head == food:
                    ## Ate food - grow (don't remove tail) and respawn food
                    score += 10
                    food = spawn_food(snake)
                else:
                    ## No food - remove tail to maintain length
                    snake.pop()
        
        ## --- Drawing ---
        screen.fill(BG_COLOR)
        draw_grid()

        ## Draw food as a small rounded square
        fx, fy = food
        food_rect = pygame.Rect(fx * CELL_SIZE + 2, fy * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE -4)
        pygame.draw.rect(screen, FOOD_COLOR, food_rect, border_radius=4)

        ## Draw snake segments - head gets a slightly different color
        for i, (sx, sy) in enumerate(snake):
            color = SNAKE_HEAD_COLOR if i == 0 else SNAKE_COLOR
            rect = pygame.Rect(sx * CELL_SIZE + 1, sy * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2)
            pygame.draw.rect(screen, color, rect, border_radius=3)

        ## Draw score in top-left corner
        score_text = font.render(f"Score: {score}", True, SCORE_COLOR)
        screen.blit(score_text, (10, 10))

        ## Draw game over overlay
        if game_over:
            overlay = pygame.Surface((WIDTH, HEIGHT), pygame.SRCALPHA)
            overlay.fill((0, 0, 0, 150))
            screen.blit(overlay, (0, 0)) 

            go_text = big_font.render("Game Over", True, FOOD_COLOR)
            go_rect = go_text.get_rect(center=(WIDTH // 2, HEIGHT // 2 - 30))
            screen.blit(go_text, go_rect)

            score_final = font.render(f"Score: {score}", True, TEXT_COLOR)
            score_rect = score_final.get_rect(center=(WIDTH // 2, HEIGHT // 2 + 20))
            screen.blit(score_final, score_rect)

            restart_text = font.render("Press SPACE to restart", True, TEXT_COLOR)
            restart_rect = restart_text.get_rect(center=(WIDTH // 2, HEIGHT // 2 + 60))
            screen.blit(restart_text, restart_rect)
        
        pygame.display.flip()
        clock.tick(FPS)
    
    pygame.quit()
    sys.exit(0)

if __name__ == "__main__":
    main()