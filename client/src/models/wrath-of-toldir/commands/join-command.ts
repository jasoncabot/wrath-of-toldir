// automatically generated by the FlatBuffers compiler, do not modify

import * as flatbuffers from 'flatbuffers';

export class JoinCommand {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):JoinCommand {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsJoinCommand(bb:flatbuffers.ByteBuffer, obj?:JoinCommand):JoinCommand {
  return (obj || new JoinCommand()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsJoinCommand(bb:flatbuffers.ByteBuffer, obj?:JoinCommand):JoinCommand {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new JoinCommand()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static startJoinCommand(builder:flatbuffers.Builder) {
  builder.startObject(0);
}

static endJoinCommand(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createJoinCommand(builder:flatbuffers.Builder):flatbuffers.Offset {
  JoinCommand.startJoinCommand(builder);
  return JoinCommand.endJoinCommand(builder);
}
}
