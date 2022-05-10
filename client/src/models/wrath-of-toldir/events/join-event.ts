// automatically generated by the FlatBuffers compiler, do not modify

import * as flatbuffers from 'flatbuffers';

import { Entity } from '../../wrath-of-toldir/entity';


export class JoinEvent {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):JoinEvent {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsJoinEvent(bb:flatbuffers.ByteBuffer, obj?:JoinEvent):JoinEvent {
  return (obj || new JoinEvent()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsJoinEvent(bb:flatbuffers.ByteBuffer, obj?:JoinEvent):JoinEvent {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new JoinEvent()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

name():string|null
name(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
name(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

entity(obj?:Entity):Entity|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? (obj || new Entity()).__init(this.bb!.__indirect(this.bb_pos + offset), this.bb!) : null;
}

static startJoinEvent(builder:flatbuffers.Builder) {
  builder.startObject(2);
}

static addName(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, nameOffset, 0);
}

static addEntity(builder:flatbuffers.Builder, entityOffset:flatbuffers.Offset) {
  builder.addFieldOffset(1, entityOffset, 0);
}

static endJoinEvent(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

}
