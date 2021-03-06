import EngineData from "../data/engine.json";
import BlockData from "../data/block.json";

import Block, {
  getData,
  moveTo, moveBy,
  rotate, ROTATE_LEFT, ROTATE_RIGHT,
} from "../structs/block";
import Ground from "../structs/ground";

import Random from "../utils/random";
import EngineRandom from "./random";

export default class EngineCore {
  constructor(playfield, randomSeed) {
    const randomSource = new Random(randomSeed);
    this.engineRandom = new EngineRandom(randomSource.next());
    this.garbageRandom = new Random(randomSource.next());

    this.ground = new Ground(playfield);
    this.block = null;
    this.maskBlock = null;
    this.holdBlock = null;
    this.hasHeld = false;
    this.showBlock = true;
    this.isLocked = false;
    this.nextBlocks = [];
    for (let i = 0; i < EngineData.next; i++) {
      this.nextBlocks.push(this.randomBlock());
    }
    this.garbageConsumed = 0;
    this.garbageProduced = 0;
    this.score = 0;
  }

  randomBlock() {
    return Block({
      type: this.engineRandom.next(),
    });
  }
  initializePosition() {
    const data = getData(this.block);
    this.block = moveTo(this.block,
      Math.floor((this.ground.width - data.size.width) / 2 + BlockData.offset.x),
      Math.floor(-data.size.height / 2 + BlockData.offset.y));
  }
  next() {
    this.block = this.nextBlocks.shift();
    this.initializePosition();
    this.hasHeld = false;
    this.showBlock = true;
    this.isLocked = false;
    this.nextBlocks.push(this.randomBlock());
    this.calculateMask();
  }

  calculateMask() {
    this.maskBlock = this.block;
    while (this.checkAvailable(moveBy(this.maskBlock, 0, 1))) {
      this.maskBlock = moveBy(this.maskBlock, 0, 1);
    }
  }

  clearLines() {
    const clearedLines = this.ground.clearLines();
    this.score += EngineData.score.lines[clearedLines];
    this.garbageProduced += EngineData.config.garbage[clearedLines];
  }

  consumeGarbage(externalGarbage) {
    const unconsumedGarbage = externalGarbage - this.garbageConsumed;
    if (unconsumedGarbage > 0) {
      this.ground.addGarbage(unconsumedGarbage, this.garbageRandom);
      this.garbageConsumed += unconsumedGarbage;
    }
  }

  hold() {
    const nextBlock = this.holdBlock;
    this.holdBlock = Block({
      type: this.block.type,
    });
    this.block = nextBlock;
    if (!this.block) {
      this.next();
    } else {
      this.initializePosition();
      this.calculateMask();
    }
    this.hasHeld = true;
  }
  canHold() {
    return !this.hasHeld;
  }
  tryHold() {
    let result;
    if ((result = this.canHold())) {
      this.hold();
    }
    return result;
  }

  checkAvailable(block = this.block) {
    return this.ground.checkAvailable(block);
  }
  isDead() {
    return !this.checkAvailable();
  }

  place(block = this.block) {
    return this.ground.place(block);
  }
  lock() {
    this.isLocked = true;
    this.place();
  }

  moveBy(x, y) {
    this.block = moveBy(this.block, x, y);
    this.calculateMask();
  }
  canMoveBy(x, y) {
    return this.checkAvailable(moveBy(this.block, x, y));
  }
  tryMoveBy(x, y) {
    let result;
    if ((result = this.canMoveBy(x, y))) {
      this.moveBy(x, y);
    }
    return result;
  }

  moveLeft() {
    this.moveBy(-1, 0);
  }
  canMoveLeft() {
    return this.canMoveBy(-1, 0);
  }
  tryMoveLeft() {
    return this.tryMoveBy(-1, 0);
  }

  moveRight() {
    this.moveBy(1, 0);
  }
  canMoveRight() {
    return this.canMoveBy(1, 0);
  }
  tryMoveRight() {
    return this.tryMoveBy(1, 0);
  }

  drop() {
    this.moveBy(0, 1);
  }
  canDrop() {
    return this.canMoveBy(0, 1);
  }
  tryDrop() {
    return this.tryMoveBy(0, 1);
  }

  rotate(direction, offset = [0, 0]) {
    this.block = rotate(moveBy(this.block, offset[0], offset[1]), direction);
    this.calculateMask();
  }
  canRotate(direction) {
    const data = getData(this.block);
    const rotatedData = getData(rotate(this.block, direction));
    for (let i = 0; i < data.position.length; i++) {
      const offset = [
        data.position[i][0] - rotatedData.position[i][0],
        data.position[i][1] - rotatedData.position[i][1],
      ];
      const rotated = rotate(moveBy(this.block, offset[0], offset[1]), direction);
      if (this.checkAvailable(rotated)) {
        return offset;
      }
    }
    return null;
  }
  tryRotate(direction) {
    let result;
    if ((result = this.canRotate(direction))) {
      this.rotate(direction, result);
    }
    return result;
  }

  rotateLeft(offset) {
    this.rotate(ROTATE_LEFT, offset);
  }
  canRotateLeft() {
    return this.canRotate(ROTATE_LEFT);
  }
  tryRotateLeft() {
    return this.tryRotate(ROTATE_LEFT);
  }

  rotateRight(offset) {
    this.rotate(ROTATE_RIGHT, offset);
  }
  canRotateRight() {
    return this.canRotate(ROTATE_RIGHT);
  }
  tryRotateRight() {
    return this.tryRotate(ROTATE_RIGHT);
  }
}
