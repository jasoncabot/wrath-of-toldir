// automatically generated by the FlatBuffers compiler, do not modify

import * as flatbuffers from 'flatbuffers';

import { AttackData, unionToAttackData, unionListToAttackData } from '../../wrath-of-toldir/attacks/attack-data';


export class AttackCommand {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):AttackCommand {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsAttackCommand(bb:flatbuffers.ByteBuffer, obj?:AttackCommand):AttackCommand {
  return (obj || new AttackCommand()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsAttackCommand(bb:flatbuffers.ByteBuffer, obj?:AttackCommand):AttackCommand {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new AttackCommand()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

dataType():AttackData {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.readUint8(this.bb_pos + offset) : AttackData.NONE;
}

data<T extends flatbuffers.Table>(obj:any):any|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.__union(obj, this.bb_pos + offset) : null;
}

static startAttackCommand(builder:flatbuffers.Builder) {
  builder.startObject(2);
}

static addDataType(builder:flatbuffers.Builder, dataType:AttackData) {
  builder.addFieldInt8(0, dataType, AttackData.NONE);
}

static addData(builder:flatbuffers.Builder, dataOffset:flatbuffers.Offset) {
  builder.addFieldOffset(1, dataOffset, 0);
}

static endAttackCommand(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createAttackCommand(builder:flatbuffers.Builder, dataType:AttackData, dataOffset:flatbuffers.Offset):flatbuffers.Offset {
  AttackCommand.startAttackCommand(builder);
  AttackCommand.addDataType(builder, dataType);
  AttackCommand.addData(builder, dataOffset);
  return AttackCommand.endAttackCommand(builder);
}
}
