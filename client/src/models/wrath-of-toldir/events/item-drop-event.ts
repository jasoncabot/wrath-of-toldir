// automatically generated by the FlatBuffers compiler, do not modify

import * as flatbuffers from 'flatbuffers';

import { ItemTexture } from '../../wrath-of-toldir/items/item-texture';
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

id(index: number):number|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.readUint8(this.bb!.__vector(this.bb_pos + offset) + index) : 0;
}

idLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

idArray():Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? new Uint8Array(this.bb!.bytes().buffer, this.bb!.bytes().byteOffset + this.bb!.__vector(this.bb_pos + offset), this.bb!.__vector_len(this.bb_pos + offset)) : null;
}

template():ItemTexture {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? this.bb!.readInt8(this.bb_pos + offset) : ItemTexture.Sword;
}

static startItemDropEvent(builder:flatbuffers.Builder) {
  builder.startObject(3);
}

static addPos(builder:flatbuffers.Builder, posOffset:flatbuffers.Offset) {
  builder.addFieldStruct(0, posOffset, 0);
}

static addId(builder:flatbuffers.Builder, idOffset:flatbuffers.Offset) {
  builder.addFieldOffset(1, idOffset, 0);
}

static createIdVector(builder:flatbuffers.Builder, data:number[]|Uint8Array):flatbuffers.Offset {
  builder.startVector(1, data.length, 1);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addInt8(data[i]!);
  }
  return builder.endVector();
}

static startIdVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(1, numElems, 1);
}

static addTemplate(builder:flatbuffers.Builder, template:ItemTexture) {
  builder.addFieldInt8(2, template, ItemTexture.Sword);
}

static endItemDropEvent(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createItemDropEvent(builder:flatbuffers.Builder, posOffset:flatbuffers.Offset, idOffset:flatbuffers.Offset, template:ItemTexture):flatbuffers.Offset {
  ItemDropEvent.startItemDropEvent(builder);
  ItemDropEvent.addPos(builder, posOffset);
  ItemDropEvent.addId(builder, idOffset);
  ItemDropEvent.addTemplate(builder, template);
  return ItemDropEvent.endItemDropEvent(builder);
}
}
