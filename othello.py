"""Simple command-line Othello/Reversi game implementation.

This module provides the core game mechanics for Othello (also known as
Reversi) and exposes a ``play_game`` function for an interactive
command-line experience.  The game is designed for two human players who
alternate turns entering their moves using algebraic notation (e.g. ``d3``).

The focus of this implementation is clarity and correctness over
performance.  The board is represented as an 8x8 list of lists containing
characters:

``'.'``  - Empty square
``'B'`` - Black disc
``'W'`` - White disc

Black always plays first.  The game ends when neither player has a valid
move or when the board is full.  The final score is the number of discs of
each colour on the board.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional, Tuple

BOARD_SIZE = 8
EMPTY = "."
BLACK = "B"
WHITE = "W"

# Directions covering all straight and diagonal lines on the board.
DIRECTIONS: Tuple[Tuple[int, int], ...] = (
    (-1, -1), (-1, 0), (-1, 1),
    (0, -1),           (0, 1),
    (1, -1),  (1, 0),  (1, 1),
)


@dataclass
class Move:
    """Representation of a potential move.

    Attributes
    ----------
    row, col:
        Zero-based coordinates of the move on the board.
    flips:
        A list of discs that would be flipped by this move, encoded as
        ``(row, col)`` tuples.
    """

    row: int
    col: int
    flips: List[Tuple[int, int]]


def create_initial_board() -> List[List[str]]:
    """Return a new board initialised with the standard Othello setup."""

    board = [[EMPTY for _ in range(BOARD_SIZE)] for _ in range(BOARD_SIZE)]
    mid = BOARD_SIZE // 2
    board[mid - 1][mid - 1] = WHITE
    board[mid][mid] = WHITE
    board[mid - 1][mid] = BLACK
    board[mid][mid - 1] = BLACK
    return board


def opponent(player: str) -> str:
    """Return the opposing player colour."""

    return BLACK if player == WHITE else WHITE


def on_board(row: int, col: int) -> bool:
    """Check whether the coordinates are within the board boundaries."""

    return 0 <= row < BOARD_SIZE and 0 <= col < BOARD_SIZE


def discs_to_flip(board: List[List[str]], player: str, row: int, col: int) -> List[Tuple[int, int]]:
    """Return discs that would be flipped if ``player`` plays at (row, col).

    The square must be empty; otherwise an empty list is returned.
    """

    if not on_board(row, col) or board[row][col] != EMPTY:
        return []

    flips: List[Tuple[int, int]] = []
    for d_row, d_col in DIRECTIONS:
        temp: List[Tuple[int, int]] = []
        r, c = row + d_row, col + d_col
        while on_board(r, c) and board[r][c] == opponent(player):
            temp.append((r, c))
            r += d_row
            c += d_col
        if temp and on_board(r, c) and board[r][c] == player:
            flips.extend(temp)
    return flips


def valid_moves(board: List[List[str]], player: str) -> Dict[Tuple[int, int], Move]:
    """Return a mapping from coordinates to :class:`Move` for legal moves."""

    moves: Dict[Tuple[int, int], Move] = {}
    for row in range(BOARD_SIZE):
        for col in range(BOARD_SIZE):
            flips = discs_to_flip(board, player, row, col)
            if flips:
                moves[(row, col)] = Move(row=row, col=col, flips=flips)
    return moves


def apply_move(board: List[List[str]], move: Move, player: str) -> None:
    """Apply ``move`` to ``board`` for ``player`` and flip affected discs."""

    board[move.row][move.col] = player
    for r, c in move.flips:
        board[r][c] = player


def has_valid_move(board: List[List[str]], player: str) -> bool:
    """Return ``True`` if ``player`` has at least one legal move."""

    return any(discs_to_flip(board, player, row, col)
               for row in range(BOARD_SIZE)
               for col in range(BOARD_SIZE))


def board_full(board: List[List[str]]) -> bool:
    """Return ``True`` if the board has no empty squares."""

    return all(cell != EMPTY for row in board for cell in row)


def game_over(board: List[List[str]]) -> bool:
    """Return ``True`` when neither player can make a move or board is full."""

    return board_full(board) or (
        not has_valid_move(board, BLACK) and not has_valid_move(board, WHITE)
    )


def score(board: List[List[str]]) -> Tuple[int, int]:
    """Return a tuple ``(black_count, white_count)``."""

    black = sum(cell == BLACK for row in board for cell in row)
    white = sum(cell == WHITE for row in board for cell in row)
    return black, white


def render_board(board: List[List[str]]) -> str:
    """Return a string representation of the current board state."""

    header = "  " + " ".join(chr(ord("a") + i) for i in range(BOARD_SIZE))
    rows = [header]
    for idx, row in enumerate(board, start=1):
        rows.append(f"{idx} " + " ".join(row))
    return "\n".join(rows)


def parse_move(text: str) -> Optional[Tuple[int, int]]:
    """Convert an algebraic move like ``"d3"`` into zero-based coordinates.

    Returns ``None`` if the input is not a valid coordinate string.
    """

    text = text.strip().lower()
    if len(text) != 2:
        return None
    col_char, row_char = text[0], text[1]
    if not ("a" <= col_char <= "h" and "1" <= row_char <= "8"):
        return None
    col = ord(col_char) - ord("a")
    row = int(row_char) - 1
    return row, col


def prompt_move(player: str, moves: Dict[Tuple[int, int], Move]) -> Optional[Move]:
    """Prompt the user for a move and return the chosen :class:`Move`.

    Entering ``"pass"`` passes the turn if no moves are available.  Invalid
    inputs are rejected with a helpful message.
    """

    while True:
        entry = input(f"Player {player} move (e.g. d3) or 'pass': ").strip().lower()
        if entry == "pass":
            if moves:
                print("You have legal moves and cannot pass.")
                continue
            return None
        coords = parse_move(entry)
        if coords is None:
            print("Invalid input. Use column letter (a-h) followed by row number (1-8).")
            continue
        move = moves.get(coords)
        if move is None:
            print("Illegal move. Choose one of the highlighted options.")
            continue
        return move


def highlight_board(board: List[List[str]], moves: Iterable[Move]) -> str:
    """Return a board representation with legal moves marked by ``*``."""

    temp_board = [row.copy() for row in board]
    for move in moves:
        temp_board[move.row][move.col] = "*"
    return render_board(temp_board)


def play_game() -> None:
    """Run an interactive two-player Othello game in the terminal."""

    board = create_initial_board()
    player = BLACK

    while not game_over(board):
        moves_dict = valid_moves(board, player)
        moves = list(moves_dict.values())

        print("\n" + highlight_board(board, moves) if moves else "\n" + render_board(board))
        if moves:
            print(f"Player {player} has {len(moves)} legal move(s).")
        else:
            print(f"Player {player} has no legal moves and must pass.")

        move = prompt_move(player, moves_dict)
        if move is None:
            # Player passed; switch turns.
            player = opponent(player)
            continue

        apply_move(board, move, player)
        player = opponent(player)

    black_score, white_score = score(board)
    print("\nFinal board:")
    print(render_board(board))
    print(f"Score - Black: {black_score}, White: {white_score}")
    if black_score > white_score:
        print("Black wins!")
    elif white_score > black_score:
        print("White wins!")
    else:
        print("The game is a draw.")


if __name__ == "__main__":
    play_game()
