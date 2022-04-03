// automatically generated by the FlatBuffers compiler, do not modify

import * as flatbuffers from 'flatbuffers';

import { Vec2 } from '../../wrath-of-toldir/vec2';


export class MoveEvent {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):MoveEvent {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsMoveEvent(bb:flatbuffers.ByteBuffer, obj?:MoveEvent):MoveEvent {
  return (obj || new MoveEvent()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsMoveEvent(bb:flatbuffers.ByteBuffer, obj?:MoveEvent):MoveEvent {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new MoveEvent()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

key():number {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.readInt32(this.bb_pos + offset) : 0;
}

pos(obj?:Vec2):Vec2|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? (obj || new Vec2()).__init(this.bb_pos + offset, this.bb!) : null;
}

charLayer():string|null
charLayer(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
charLayer(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

static startMoveEvent(builder:flatbuffers.Builder) {
  builder.startObject(3);
}

static addKey(builder:flatbuffers.Builder, key:number) {
  builder.addFieldInt32(0, key, 0);
}

static addPos(builder:flatbuffers.Builder, posOffset:flatbuffers.Offset) {
  builder.addFieldStruct(1, posOffset, 0);
}

static addCharLayer(builder:flatbuffers.Builder, charLayerOffset:flatbuffers.Offset) {
  builder.addFieldOffset(2, charLayerOffset, 0);
}

static endMoveEvent(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

}
