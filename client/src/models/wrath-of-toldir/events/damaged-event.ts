// automatically generated by the FlatBuffers compiler, do not modify

import * as flatbuffers from 'flatbuffers';

import { DamageState } from '../../wrath-of-toldir/events/damage-state';


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

hp():number {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? this.bb!.readUint32(this.bb_pos + offset) : 0;
}

state():DamageState {
  const offset = this.bb!.__offset(this.bb_pos, 10);
  return offset ? this.bb!.readInt8(this.bb_pos + offset) : DamageState.Default;
}

static startDamagedEvent(builder:flatbuffers.Builder) {
  builder.startObject(4);
}

static addKey(builder:flatbuffers.Builder, key:number) {
  builder.addFieldInt32(0, key, 0);
}

static addAmount(builder:flatbuffers.Builder, amount:number) {
  builder.addFieldInt16(1, amount, 0);
}

static addHp(builder:flatbuffers.Builder, hp:number) {
  builder.addFieldInt32(2, hp, 0);
}

static addState(builder:flatbuffers.Builder, state:DamageState) {
  builder.addFieldInt8(3, state, DamageState.Default);
}

static endDamagedEvent(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createDamagedEvent(builder:flatbuffers.Builder, key:number, amount:number, hp:number, state:DamageState):flatbuffers.Offset {
  DamagedEvent.startDamagedEvent(builder);
  DamagedEvent.addKey(builder, key);
  DamagedEvent.addAmount(builder, amount);
  DamagedEvent.addHp(builder, hp);
  DamagedEvent.addState(builder, state);
  return DamagedEvent.endDamagedEvent(builder);
}
}
