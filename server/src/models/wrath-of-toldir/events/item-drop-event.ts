// automatically generated by the FlatBuffers compiler, do not modify

import * as flatbuffers from 'flatbuffers';

import { Item } from '../../wrath-of-toldir/items/item';
import { Vec2 } from '../../wrath-of-toldir/vec2';


export class ItemDropEvent {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):ItemDropEvent {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsItemDropEvent(bb:flatbuffers.ByteBuffer, obj?:ItemDropEvent):ItemDropEvent {
  return (obj || new ItemDropEvent()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsItemDropEvent(bb:flatbuffers.ByteBuffer, obj?:ItemDropEvent):ItemDropEvent {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new ItemDropEvent()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

pos(obj?:Vec2):Vec2|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? (obj || new Vec2()).__init(this.bb_pos + offset, this.bb!) : null;
}

item(obj?:Item):Item|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? (obj || new Item()).__init(this.bb!.__indirect(this.bb_pos + offset), this.bb!) : null;
}

static startItemDropEvent(builder:flatbuffers.Builder) {
  builder.startObject(2);
}

static addPos(builder:flatbuffers.Builder, posOffset:flatbuffers.Offset) {
  builder.addFieldStruct(0, posOffset, 0);
}

static addItem(builder:flatbuffers.Builder, itemOffset:flatbuffers.Offset) {
  builder.addFieldOffset(1, itemOffset, 0);
}

static endItemDropEvent(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

}
