import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from './supabaseClient';
import './styles.css';

const TILE = {
  wall: '#',
  floor: ' ',
  goal: '.',
  player: '@',
  box: '$',
  boxOnGoal: '*',
  playerOnGoal: '+',
};

const LEVELS = [
  [
    '#######',
    '#     #',
    '# .$@ #',
    '#  .  #',
    '#     #',
    '#######',
  ],
  [
    '########',
    '#  .   #',
    '#  $   #',
    '#  @   #',
    '#  . $ #',
    '#      #',
    '########',
  ],
  [
    '########',
    '#   .  #',
    '#  $$  #',
    '#  @.  #',
    '#      #',
    '########',
  ],
  [
    '#########',
    '#   .   #',
    '#  ###  #',
    '# @$ .  #',
    '#  $    #',
    '#       #',
    '#########',
  ],
  [
    '#########',
    '# .   . #',
    '#   #   #',
    '# $$@   #',
    '#   #   #',
    '#       #',
    '#########',
  ],
  [
    '##########',
    '#   .    #',
    '#  ### $ #',
    '# @  $ . #',
    '#   .    #',
    '#        #',
    '##########',
  ],
  [
    '##########',
    '# .    . #',
    '#  ##    #',
    '#  $@$   #',
    '#    ##  #',
    '#        #',
    '##########',
  ],
  [
    '###########',
    '# .     . #',
    '#   ###   #',
    '# $  @  $ #',
    '#   ###   #',
    '#    .    #',
    '###########',
  ],
  [
    '############',
    '#. . . .   #',
    '#   $   $  #',
    '# ##  #    #',
    '#   @  $ . #',
    '# . $ #    #',
    '############',
  ],
  [
    '###########',
    '#   #   . #',
    '# $   #   #',
    '#  # $  . #',
    '# .  @ #$ #',
    '#   $   . #',
    '###########',
  ],
];

const DIRECTIONS = {
  ArrowUp: { row: -1, col: 0 },
  ArrowDown: { row: 1, col: 0 },
  ArrowLeft: { row: 0, col: -1 },
  ArrowRight: { row: 0, col: 1 },
};

const APPLE_DROP_CHANCE = 0.1;

function parseLevel(rows) {
  const walls = new Set();
  const goals = new Set();
  const boxes = [];
  let player = { row: 0, col: 0 };

  rows.forEach((line, row) => {
    [...line].forEach((cell, col) => {
      const key = posKey(row, col);
      if (cell === TILE.wall) walls.add(key);
      if (cell === TILE.goal || cell === TILE.boxOnGoal || cell === TILE.playerOnGoal) goals.add(key);
      if (cell === TILE.box || cell === TILE.boxOnGoal) boxes.push({ row, col });
      if (cell === TILE.player || cell === TILE.playerOnGoal) player = { row, col };
    });
  });

  return {
    rows: rows.length,
    cols: Math.max(...rows.map((row) => row.length)),
    walls,
    goals,
    boxes,
    player,
    apples: new Set(),
    moves: 0,
  };
}

function posKey(row, col) {
  return `${row}:${col}`;
}

function samePos(a, b) {
  return a.row === b.row && a.col === b.col;
}

function isComplete(state) {
  return state.boxes.every((box) => state.goals.has(posKey(box.row, box.col)));
}

function moveState(state, direction) {
  const nextPlayer = {
    row: state.player.row + direction.row,
    col: state.player.col + direction.col,
  };
  const nextKey = posKey(nextPlayer.row, nextPlayer.col);

  if (state.walls.has(nextKey)) return state;

  const boxIndex = state.boxes.findIndex((box) => samePos(box, nextPlayer));

  if (boxIndex === -1) {
    return { ...state, player: nextPlayer, moves: state.moves + 1 };
  }

  const pushedBox = {
    row: nextPlayer.row + direction.row,
    col: nextPlayer.col + direction.col,
  };
  const pushedKey = posKey(pushedBox.row, pushedBox.col);
  const blockedByBox = state.boxes.some((box, index) => index !== boxIndex && samePos(box, pushedBox));

  if (state.walls.has(pushedKey) || blockedByBox) return state;

  const boxes = state.boxes.map((box, index) => (index === boxIndex ? pushedBox : box));
  return { ...state, boxes, player: nextPlayer, moves: state.moves + 1 };
}

function maybeDropApple(previousState, nextState) {
  if (previousState === nextState || Math.random() >= APPLE_DROP_CHANCE) return nextState;

  const appleKey = posKey(previousState.player.row, previousState.player.col);
  if (nextState.apples.has(appleKey)) return nextState;

  return {
    ...nextState,
    apples: new Set([...nextState.apples, appleKey]),
  };
}

function collectApple(state) {
  const playerKey = posKey(state.player.row, state.player.col);
  if (!state.apples.has(playerKey)) return state;

  const apples = new Set(state.apples);
  apples.delete(playerKey);

  return { ...state, apples };
}

function moveWithApples(state, direction) {
  const movedState = moveState(state, direction);
  const playerKey = posKey(movedState.player.row, movedState.player.col);
  const pickedUp = movedState.apples.has(playerKey);
  const finalState = maybeDropApple(state, collectApple(movedState));

  return { state: finalState, pickedUp };
}

function App() {
  const [levelIndex, setLevelIndex] = useState(0);
  const [gameState, setGameState] = useState(() => parseLevel(LEVELS[0]));
  const [finished, setFinished] = useState(false);
  const [appleCount, setAppleCount] = useState(0);
  const [appleItemId, setAppleItemId] = useState(null);
  const completed = isComplete(gameState);

  useEffect(() => {
    let active = true;

    async function loadAppleCount() {
      const { data, error } = await supabase
        .from('item')
        .select('id, apple_count')
        .order('id', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!active) return;
      if (error) {
        console.error('사과 개수를 불러오지 못했습니다.', error);
        return;
      }
      if (data) {
        setAppleItemId(data.id);
        setAppleCount(data.apple_count ?? 0);
      }
    }

    loadAppleCount();
    return () => {
      active = false;
    };
  }, []);

  const saveAppleCount = async (count) => {
    if (appleItemId == null) return;
    const { error } = await supabase
      .from('item')
      .update({ apple_count: count })
      .eq('id', appleItemId);

    if (error) console.error('사과 개수를 저장하지 못했습니다.', error);
  };

  const boardCells = useMemo(() => {
    const cells = [];
    for (let row = 0; row < gameState.rows; row += 1) {
      for (let col = 0; col < gameState.cols; col += 1) {
        const key = posKey(row, col);
        cells.push({
          key,
          row,
          col,
          wall: gameState.walls.has(key),
          goal: gameState.goals.has(key),
        });
      }
    }
    return cells;
  }, [gameState]);

  const resetLevel = () => {
    setFinished(false);
    setGameState(parseLevel(LEVELS[levelIndex]));
  };

  const goToLevel = (index) => {
    setFinished(false);
    setLevelIndex(index);
    setGameState(parseLevel(LEVELS[index]));
  };

  const nextLevel = () => {
    if (levelIndex === LEVELS.length - 1) {
      setFinished(true);
      return;
    }
    goToLevel(levelIndex + 1);
  };

  const move = (direction) => {
    if (finished || completed) return;
    const { state: next, pickedUp } = moveWithApples(gameState, direction);
    setGameState(next);

    if (pickedUp) {
      const updatedCount = appleCount + 1;
      setAppleCount(updatedCount);
      saveAppleCount(updatedCount);
    }
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      const direction = DIRECTIONS[event.key];
      if (!direction) return;
      event.preventDefault();
      move(direction);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <main className="app-shell">
      <section className="game-panel" aria-label="동굴 소코반 게임">
        <header className="top-bar">
          <div>
            <p className="eyebrow">Cave Sokoban</p>
            <h1>동굴 소코반</h1>
          </div>
          <div className="stats" aria-label="게임 상태">
            <span>{levelIndex + 1}/10 단계</span>
            <span>{gameState.moves} 이동</span>
            <span>사과 {appleCount}개</span>
          </div>
        </header>

        <div
          className="board"
          style={{
            '--rows': gameState.rows,
            '--cols': gameState.cols,
          }}
        >
          {boardCells.map((cell) => (
            <div
              className={`tile ${cell.wall ? 'wall' : 'floor'} ${cell.goal ? 'goal' : ''}`}
              key={cell.key}
              style={{
                gridRow: cell.row + 1,
                gridColumn: cell.col + 1,
              }}
            />
          ))}

          {[...gameState.apples].map((appleKey) => {
            const [row, col] = appleKey.split(':').map(Number);
            return (
              <div
                className="piece apple"
                key={`apple-${appleKey}`}
                style={{
                  '--row': row,
                  '--col': col,
                }}
                aria-label="사과"
              />
            );
          })}

          {gameState.boxes.map((box, index) => {
            const onGoal = gameState.goals.has(posKey(box.row, box.col));
            return (
              <div
                className={`piece box ${onGoal ? 'on-goal' : ''}`}
                key={`box-${index}`}
                style={{
                  '--row': box.row,
                  '--col': box.col,
                }}
                aria-label="상자"
              />
            );
          })}

          <div
            className="piece player"
            style={{
              '--row': gameState.player.row,
              '--col': gameState.player.col,
            }}
            aria-label="플레이어"
          />
        </div>

        <div className="actions">
          <button type="button" onClick={resetLevel}>다시 시작</button>
          <button type="button" onClick={() => goToLevel(0)}>처음으로</button>
          <button type="button" onClick={nextLevel} disabled={!completed && !finished}>
            {levelIndex === LEVELS.length - 1 ? '완료' : '다음 단계'}
          </button>
        </div>

        <div className="controls" aria-label="방향 조작">
          <button type="button" className="control up" aria-label="위로 이동" onClick={() => move(DIRECTIONS.ArrowUp)}>↑</button>
          <button type="button" className="control left" aria-label="왼쪽으로 이동" onClick={() => move(DIRECTIONS.ArrowLeft)}>←</button>
          <button type="button" className="control right" aria-label="오른쪽으로 이동" onClick={() => move(DIRECTIONS.ArrowRight)}>→</button>
          <button type="button" className="control down" aria-label="아래로 이동" onClick={() => move(DIRECTIONS.ArrowDown)}>↓</button>
        </div>

        {(completed || finished) && (
          <div className="status" role="status">
            {finished ? '10단계를 모두 완료했습니다.' : `${levelIndex + 1}단계 완료`}
          </div>
        )}
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
