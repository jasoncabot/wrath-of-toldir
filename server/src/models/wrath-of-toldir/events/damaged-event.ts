// automatically generated by the FlatBuffers compiler, do not modify

import * as flatbuffers from 'flatbuffers';

export class DamagedEvent {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):DamagedEvent {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsDamagedEvent(bb:flatbuffers.ByteBuffer, obj?:DamagedEvent):DamagedEvent {
  return (obj || new DamagedEvent()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsDamagedEvent(bb:flatbuffers.ByteBuffer, obj?:DamagedEvent):DamagedEvent {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new DamagedEvent()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

key():number {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.readUint32(this.bb_pos + offset) : 0;
}

amount():number {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.readUint16(this.bb_pos + offset) : 0;
}

static startDamagedEvent(builder:flatbuffers.Builder) {
  builder.startObject(2);
}

static addKey(builder:flatbuffers.Builder, key:number) {
  builder.addFieldInt32(0, key, 0);
}

static addAmount(builder:flatbuffers.Builder, amount:number) {
  builder.addFieldInt16(1, amount, 0);
}

static endDamagedEvent(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createDamagedEvent(builder:flatbuffers.Builder, key:number, amount:number):flatbuffers.Offset {
  DamagedEvent.startDamagedEvent(builder);
  DamagedEvent.addKey(builder, key);
  DamagedEvent.addAmount(builder, amount);
  return DamagedEvent.endDamagedEvent(builder);
}
}
