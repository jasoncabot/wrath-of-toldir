// automatically generated by the FlatBuffers compiler, do not modify

import * as flatbuffers from 'flatbuffers';

export class DurabilityComponent {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):DurabilityComponent {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsDurabilityComponent(bb:flatbuffers.ByteBuffer, obj?:DurabilityComponent):DurabilityComponent {
  return (obj || new DurabilityComponent()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsDurabilityComponent(bb:flatbuffers.ByteBuffer, obj?:DurabilityComponent):DurabilityComponent {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new DurabilityComponent()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

current():number {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.readUint8(this.bb_pos + offset) : 0;
}

maximum():number {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.readUint8(this.bb_pos + offset) : 0;
}

static startDurabilityComponent(builder:flatbuffers.Builder) {
  builder.startObject(2);
}

static addCurrent(builder:flatbuffers.Builder, current:number) {
  builder.addFieldInt8(0, current, 0);
}

static addMaximum(builder:flatbuffers.Builder, maximum:number) {
  builder.addFieldInt8(1, maximum, 0);
}

static endDurabilityComponent(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createDurabilityComponent(builder:flatbuffers.Builder, current:number, maximum:number):flatbuffers.Offset {
  DurabilityComponent.startDurabilityComponent(builder);
  DurabilityComponent.addCurrent(builder, current);
  DurabilityComponent.addMaximum(builder, maximum);
  return DurabilityComponent.endDurabilityComponent(builder);
}
}
