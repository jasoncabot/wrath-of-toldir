// automatically generated by the FlatBuffers compiler, do not modify

import * as flatbuffers from 'flatbuffers';

import { AttackData, unionToAttackData, unionListToAttackData } from '../../wrath-of-toldir/attacks/attack-data';


export class AttackEvent {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):AttackEvent {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsAttackEvent(bb:flatbuffers.ByteBuffer, obj?:AttackEvent):AttackEvent {
  return (obj || new AttackEvent()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsAttackEvent(bb:flatbuffers.ByteBuffer, obj?:AttackEvent):AttackEvent {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new AttackEvent()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

key():number {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.readUint32(this.bb_pos + offset) : 0;
}

dataType():AttackData {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.readUint8(this.bb_pos + offset) : AttackData.NONE;
}

data<T extends flatbuffers.Table>(obj:any):any|null {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? this.bb!.__union(obj, this.bb_pos + offset) : null;
}

static startAttackEvent(builder:flatbuffers.Builder) {
  builder.startObject(3);
}

static addKey(builder:flatbuffers.Builder, key:number) {
  builder.addFieldInt32(0, key, 0);
}

static addDataType(builder:flatbuffers.Builder, dataType:AttackData) {
  builder.addFieldInt8(1, dataType, AttackData.NONE);
}

static addData(builder:flatbuffers.Builder, dataOffset:flatbuffers.Offset) {
  builder.addFieldOffset(2, dataOffset, 0);
}

static endAttackEvent(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createAttackEvent(builder:flatbuffers.Builder, key:number, dataType:AttackData, dataOffset:flatbuffers.Offset):flatbuffers.Offset {
  AttackEvent.startAttackEvent(builder);
  AttackEvent.addKey(builder, key);
  AttackEvent.addDataType(builder, dataType);
  AttackEvent.addData(builder, dataOffset);
  return AttackEvent.endAttackEvent(builder);
}
}
