// automatically generated by the FlatBuffers compiler, do not modify

import * as flatbuffers from 'flatbuffers';

import { Elevation } from '../wrath-of-toldir/elevation';
import { EntityTexture } from '../wrath-of-toldir/entity-texture';
import { Vec2 } from '../wrath-of-toldir/vec2';


export class Entity {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):Entity {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsEntity(bb:flatbuffers.ByteBuffer, obj?:Entity):Entity {
  return (obj || new Entity()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsEntity(bb:flatbuffers.ByteBuffer, obj?:Entity):Entity {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new Entity()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

key():number {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.readUint32(this.bb_pos + offset) : 0;
}

texture():EntityTexture {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.readInt8(this.bb_pos + offset) : EntityTexture.BabySlime1;
}

pos(obj?:Vec2):Vec2|null {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? (obj || new Vec2()).__init(this.bb_pos + offset, this.bb!) : null;
}

charLayer():Elevation {
  const offset = this.bb!.__offset(this.bb_pos, 10);
  return offset ? this.bb!.readInt8(this.bb_pos + offset) : Elevation.Unknown;
}

hp():number {
  const offset = this.bb!.__offset(this.bb_pos, 12);
  return offset ? this.bb!.readUint32(this.bb_pos + offset) : 0;
}

maxHp():number {
  const offset = this.bb!.__offset(this.bb_pos, 14);
  return offset ? this.bb!.readUint32(this.bb_pos + offset) : 0;
}

static startEntity(builder:flatbuffers.Builder) {
  builder.startObject(6);
}

static addKey(builder:flatbuffers.Builder, key:number) {
  builder.addFieldInt32(0, key, 0);
}

static addTexture(builder:flatbuffers.Builder, texture:EntityTexture) {
  builder.addFieldInt8(1, texture, EntityTexture.BabySlime1);
}

static addPos(builder:flatbuffers.Builder, posOffset:flatbuffers.Offset) {
  builder.addFieldStruct(2, posOffset, 0);
}

static addCharLayer(builder:flatbuffers.Builder, charLayer:Elevation) {
  builder.addFieldInt8(3, charLayer, Elevation.Unknown);
}

static addHp(builder:flatbuffers.Builder, hp:number) {
  builder.addFieldInt32(4, hp, 0);
}

static addMaxHp(builder:flatbuffers.Builder, maxHp:number) {
  builder.addFieldInt32(5, maxHp, 0);
}

static endEntity(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

}
