// automatically generated by the FlatBuffers compiler, do not modify

import * as flatbuffers from 'flatbuffers';

export class LeaveEvent {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):LeaveEvent {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsLeaveEvent(bb:flatbuffers.ByteBuffer, obj?:LeaveEvent):LeaveEvent {
  return (obj || new LeaveEvent()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsLeaveEvent(bb:flatbuffers.ByteBuffer, obj?:LeaveEvent):LeaveEvent {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new LeaveEvent()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

key():number {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.readInt32(this.bb_pos + offset) : 0;
}

static startLeaveEvent(builder:flatbuffers.Builder) {
  builder.startObject(1);
}

static addKey(builder:flatbuffers.Builder, key:number) {
  builder.addFieldInt32(0, key, 0);
}

static endLeaveEvent(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createLeaveEvent(builder:flatbuffers.Builder, key:number):flatbuffers.Offset {
  LeaveEvent.startLeaveEvent(builder);
  LeaveEvent.addKey(builder, key);
  return LeaveEvent.endLeaveEvent(builder);
}
}
