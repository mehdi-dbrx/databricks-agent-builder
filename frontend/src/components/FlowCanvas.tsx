import { useCallback } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { getBlockDefinition, DRAG_DATA_KEY } from '../blockDefinitions'
import type { BlockTypeId } from '../blockDefinitions'
import { BlockNode } from './nodes/BlockNode'

const nodeTypes: NodeTypes = {
  block: BlockNode,
}

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'block',
    position: { x: 200, y: 120 },
    data: { blockType: 'agent', label: 'Agent' },
  },
]

const initialEdges: Edge[] = []

export function FlowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const { screenToFlowPosition } = useReactFlow()

  const onConnect = useCallback(
    (params: Connection) => setEdges((prev) => addEdge(params, prev)),
    [setEdges],
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const blockType = e.dataTransfer.getData(DRAG_DATA_KEY) as BlockTypeId
      if (!blockType) return
      const def = getBlockDefinition(blockType)
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      setNodes((nds) =>
        nds.concat({
          id: `node-${Date.now()}`,
          type: 'block',
          position,
          data: { blockType, label: def.label },
        }),
      )
    },
    [screenToFlowPosition, setNodes],
  )

  return (
    <div className="h-full w-full flex-1 min-w-0">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        fitView
        className="bg-zinc-100"
      >
        <Background color="#f9ada8" gap={16} />
        <Controls className="!shadow-sm !border-zinc-200 !bg-white" />
        <MiniMap
          className="!bg-white !border-zinc-200"
          nodeColor="#e4e4e7"
          maskColor="rgb(244 244 245 / 0.8)"
        />
      </ReactFlow>
    </div>
  )
}
