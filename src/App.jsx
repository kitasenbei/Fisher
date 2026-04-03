import { useState } from 'react'
import {
  Move,
  RotateCcw,
  Maximize,
  MousePointer2,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Filter,
  Box,
  Circle,
  Lightbulb,
  FolderOpen,
  Eye,
  Lock,
  Pin,
  Video,
  Crosshair,
  Hand,
  Grid3x3,
  Pen,
  Ruler,
  Scissors,
  Pencil,
  Wrench,
  Magnet,
  Layers,
  Database,
  Gem,
  Zap,
  Camera,
  Plus,
  Minus,
  Copy,
  Download,
  Sun,
  Cloud,
  Droplets,
  Wind,
  Flame,
  Snowflake,
  Music,
  Image,
  Film,
  Globe,
  Monitor,
  Speaker,
  Mic,
  Package,
  XCircle,
} from 'lucide-react'
import {
  Button,
  Input,
  Textarea,
  Select,
  Card,
  Modal,
  Badge,
  Avatar,
  Checkbox,
  Radio,
  Toggle,
  Slider,
  NumberInput,
  VectorInput,
  ColorPicker,
  Tooltip,
  ToastProvider,
  useToast,
  Progress,
  Skeleton,
  ContextMenu,
  useContextMenu,
  DropdownMenu,
  Dialog,
  Tree,
  Breadcrumb,
  MenuBar,
  Toolbar,
  StatusBar,
  PropertyPanel,
  PropertyRow,
  SegmentedControl,
  WorkspaceTabs,
  ToolStrip,
  IconTabStrip,
  ViewportOverlay,
  GizmoStrip,
  TransportControls,
  Outliner,
  IconToggle,
  KeyframeDot,
  Scrollbar,
} from './components'

const IS = { size: 11, strokeWidth: 1.5 }
const IT = { size: 14, strokeWidth: 1.5 }

function App() {
  // State galore
  const [pos, setPos] = useState({ x: 2.45, y: -1.2, z: 0.8 })
  const [rot, setRot] = useState({ x: 0, y: 45, z: 0 })
  const [scl, setScl] = useState({ x: 1, y: 1, z: 1 })
  const [vel, setVel] = useState({ x: 0, y: 9.8, z: 0 })
  const [col1, setCol1] = useState('#2d8ceb')
  const [col2, setCol2] = useState('#e05555')
  const [col3, setCol3] = useState('#55b855')
  const [col4, setCol4] = useState('#cc8833')
  const [roughness, setRoughness] = useState(40)
  const [metallic, setMetallic] = useState(80)
  const [opacity, setOpacity] = useState(100)
  const [emission, setEmission] = useState(0)
  const [mass, setMass] = useState(1)
  const [friction, setFriction] = useState(50)
  const [bounce, setBounce] = useState(30)
  const [density, setDensity] = useState(1000)
  const [fov, setFov] = useState(60)
  const [near, setNear] = useState(0.1)
  const [far, setFar] = useState(1000)
  const [volume, setVolume] = useState(75)
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(50)
  const [saturation, setSaturation] = useState(50)
  const [temperature, setTemperature] = useState(6500)
  const [playing, setPlaying] = useState(false)
  const [frame, setFrame] = useState(48)
  const [treeSelected, setTreeSelected] = useState('cube')
  const [activeWorkspace, setActiveWorkspace] = useState('layout')
  const [activeTool, setActiveTool] = useState('move')
  const [activePropTab, setActivePropTab] = useState('object')
  const [activeBottomTab, setActiveBottomTab] = useState('console')
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [radio, setRadio] = useState('pbr')
  const [viewMode, setViewMode] = useState('perspective')
  const toast = useToast()
  const ctx = useContextMenu()
  const ctx2 = useContextMenu()

  const rowActions = (
    <>
      <IconToggle icon={<Eye size={10} strokeWidth={1.5} />} checked tooltip="Visibility" />
      <IconToggle icon={<Camera size={10} strokeWidth={1.5} />} checked tooltip="Render" />
    </>
  )

  return (
    <div className="flex flex-col h-screen bg-[#303030] text-[#cccccc] overflow-hidden">
      {/* Menu Bar */}
      <MenuBar
        menus={[
          {
            label: 'File',
            items: [
              { label: 'New Scene', shortcut: 'Ctrl+N', action: () => toast('New scene created', 'info') },
              { label: 'Open...', shortcut: 'Ctrl+O' },
              { label: 'Open Recent', disabled: true },
              { separator: true },
              { label: 'Save', shortcut: 'Ctrl+S', action: () => toast('Scene saved', 'success') },
              { label: 'Save As...', shortcut: 'Ctrl+Shift+S' },
              { label: 'Save Incremental', shortcut: 'Ctrl+Alt+S' },
              { separator: true },
              { label: 'Import', shortcut: 'Ctrl+I' },
              { label: 'Export', shortcut: 'Ctrl+E' },
              { label: 'Export Selection...', shortcut: 'Ctrl+Shift+E' },
              { separator: true },
              { label: 'Quit', shortcut: 'Ctrl+Q' },
            ],
          },
          {
            label: 'Edit',
            items: [
              { label: 'Undo', shortcut: 'Ctrl+Z', action: () => toast('Undo', 'info') },
              { label: 'Redo', shortcut: 'Ctrl+Shift+Z', action: () => toast('Redo', 'info') },
              { separator: true },
              { label: 'Cut', shortcut: 'Ctrl+X' },
              { label: 'Copy', shortcut: 'Ctrl+C' },
              { label: 'Paste', shortcut: 'Ctrl+V' },
              { label: 'Duplicate', shortcut: 'Ctrl+D', action: () => toast('Object duplicated', 'info') },
              { separator: true },
              { label: 'Select All', shortcut: 'A' },
              { label: 'Select None', shortcut: 'Alt+A' },
              { label: 'Invert Selection', shortcut: 'Ctrl+I' },
              { separator: true },
              { label: 'Preferences...', action: () => setModalOpen(true) },
            ],
          },
          {
            label: 'Add',
            items: [
              { label: 'Mesh >', items: [] },
              { label: 'Light >', items: [] },
              { label: 'Camera' },
              { separator: true },
              { label: 'Empty', action: () => toast('Empty added', 'info') },
              { label: 'Armature' },
              { label: 'Particle System' },
              { separator: true },
              { label: 'Force Field >' },
            ],
          },
          {
            label: 'Render',
            items: [
              { label: 'Render Image', shortcut: 'F12', action: () => toast('Rendering...', 'info') },
              { label: 'Render Animation', shortcut: 'Ctrl+F12' },
              { label: 'Render Region', shortcut: 'Ctrl+B' },
              { separator: true },
              { label: 'Bake Lighting', action: () => toast('Baking lightmaps...', 'warning') },
              { label: 'Bake Physics' },
            ],
          },
          {
            label: 'Window',
            items: [
              { label: 'New Window' },
              { label: 'Toggle Fullscreen', shortcut: 'F11' },
              { separator: true },
              { label: 'Toggle Console' },
              { label: 'Toggle Asset Browser' },
            ],
          },
          {
            label: 'Help',
            items: [
              { label: 'Documentation', shortcut: 'F1' },
              { label: 'Tutorials' },
              { separator: true },
              { label: 'Report Bug' },
              { label: 'About Fisher' },
            ],
          },
        ]}
      />

      {/* Workspace Tabs */}
      <WorkspaceTabs
        tabs={[
          { value: 'layout', label: 'Layout' },
          { value: 'modeling', label: 'Modeling' },
          { value: 'sculpting', label: 'Sculpting' },
          { value: 'uv', label: 'UV Editing' },
          { value: 'texture', label: 'Texture Paint' },
          { value: 'shading', label: 'Shading' },
          { value: 'animation', label: 'Animation' },
          { value: 'rendering', label: 'Rendering' },
          { value: 'compositing', label: 'Compositing' },
          { value: 'scripting', label: 'Scripting' },
        ]}
        value={activeWorkspace}
        onChange={setActiveWorkspace}
      />

      {/* Viewport sub-header */}
      <div className="flex items-center bg-[#3c3c3c] border-b border-[#1e1e1e] h-6 px-1.5 gap-2 text-[11px]">
        <Select
          id="mode"
          icon={<Box {...IS} />}
          options={[
            { value: 'object', label: 'Object Mode', icon: <Box {...IS} /> },
            { value: 'edit', label: 'Edit Mode', icon: <Pencil {...IS} /> },
            { value: 'sculpt', label: 'Sculpt Mode', icon: <Gem {...IS} /> },
            { value: 'vertex', label: 'Vertex Paint', icon: <Pen {...IS} /> },
            { value: 'weight', label: 'Weight Paint', icon: <Layers {...IS} /> },
          ]}
          className="!w-auto !bg-[#3c3c3c] !border-transparent !py-0 !text-[11px]"
        />
        <div className="flex gap-2 text-[#999999]">
          {['View', 'Select', 'Add', 'Object', 'Physics'].map((m) => (
            <button key={m} className="hover:text-[#cccccc] cursor-default">
              {m}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <SegmentedControl
          options={[
            { value: 'global', label: 'Global' },
            { value: 'local', label: 'Local' },
            { value: 'normal', label: 'Normal' },
          ]}
          value="global"
        />
        <div className="flex gap-0.5 ml-2">
          <Tooltip content="Snap to Grid" shortcut="Ctrl">
            <button className="p-0.5 text-[#999999] hover:text-[#cccccc] cursor-default">
              <Magnet size={12} />
            </button>
          </Tooltip>
          <Tooltip content="Proportional Editing" shortcut="O">
            <button className="p-0.5 text-[#999999] hover:text-[#cccccc] cursor-default">
              <Circle size={12} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Main 3-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* ===== LEFT: Tool strip + Scene panel ===== */}
        <div className="flex">
          {/* Tool strip */}
          <div className="w-10 shrink-0 bg-[#303030] border-r border-[#1e1e1e]">
            <ToolStrip
              value={activeTool}
              onChange={setActiveTool}
              tools={[
                { id: 'cursor', icon: <Crosshair {...IT} />, label: 'Cursor', shortcut: 'Shift+Space' },
                {
                  id: 'select',
                  icon: <MousePointer2 {...IT} />,
                  label: 'Select Box',
                  description: 'Select objects by dragging a box',
                  shortcut: 'W',
                },
                { separator: true },
                {
                  id: 'move',
                  icon: <Move {...IT} />,
                  label: 'Move',
                  description: 'Move selected items',
                  shortcut: 'G',
                },
                {
                  id: 'rotate',
                  icon: <RotateCcw {...IT} />,
                  label: 'Rotate',
                  description: 'Rotate selected items',
                  shortcut: 'R',
                },
                {
                  id: 'scale',
                  icon: <Maximize {...IT} />,
                  label: 'Scale',
                  description: 'Scale (resize) selected items',
                  shortcut: 'S',
                },
                { separator: true },
                {
                  id: 'annotate',
                  icon: <Pen {...IT} />,
                  label: 'Annotate',
                  description: 'Draw annotations on the viewport',
                },
                {
                  id: 'measure',
                  icon: <Ruler {...IT} />,
                  label: 'Measure',
                  description: 'Measure distances and angles',
                },
                {
                  id: 'knife',
                  icon: <Scissors {...IT} />,
                  label: 'Knife',
                  description: 'Cut through geometry',
                  shortcut: 'K',
                },
                { separator: true },
                { id: 'brush', icon: <Pencil {...IT} />, label: 'Brush', shortcut: 'B' },
              ]}
            />
          </div>

          {/* Scene / Assets panel */}
          <div className="w-[220px] shrink-0 bg-[#2b2b2b] border-r border-[#1e1e1e] flex flex-col">
            {/* Panel tabs */}
            <div className="flex bg-[#323232] border-b border-[#1e1e1e]">
              {['Scene', 'Assets', 'Layers'].map((tab, i) => (
                <button
                  key={tab}
                  className={`px-3 py-1.5 text-[10px] cursor-default ${
                    i === 0
                      ? 'bg-[#2b2b2b] text-[#cccccc] border-b border-[#2d8ceb]'
                      : 'text-[#999999] hover:text-[#cccccc]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Scene tree */}
            <div className="flex-1 overflow-y-auto">
              <Tree
                className="!border-0 !rounded-none"
                selected={treeSelected}
                onSelect={(n) => setTreeSelected(n.id)}
                nodes={[
                  {
                    id: 'scene',
                    label: 'Main Scene',
                    icon: <Globe size={11} strokeWidth={1.5} />,
                    expanded: true,
                    children: [
                      {
                        id: 'env',
                        label: 'Environment',
                        icon: <Sun size={11} strokeWidth={1.5} />,
                        expanded: true,
                        children: [
                          {
                            id: 'sky',
                            label: 'Sky Dome',
                            icon: <Cloud size={11} strokeWidth={1.5} />,
                            actions: rowActions,
                          },
                          {
                            id: 'sun',
                            label: 'Sun Light',
                            icon: <Sun size={11} strokeWidth={1.5} />,
                            actions: rowActions,
                          },
                          {
                            id: 'fog',
                            label: 'Volumetric Fog',
                            icon: <Wind size={11} strokeWidth={1.5} />,
                            actions: rowActions,
                          },
                        ],
                      },
                      {
                        id: 'geo',
                        label: 'Geometry',
                        icon: <FolderOpen size={11} strokeWidth={1.5} />,
                        expanded: true,
                        children: [
                          { id: 'cube', label: 'Cube', icon: <Box size={11} strokeWidth={1.5} />, actions: rowActions },
                          {
                            id: 'sphere',
                            label: 'Sphere',
                            icon: <Circle size={11} strokeWidth={1.5} />,
                            actions: rowActions,
                          },
                          {
                            id: 'plane',
                            label: 'Ground Plane',
                            icon: <Minus size={11} strokeWidth={1.5} />,
                            actions: rowActions,
                          },
                          {
                            id: 'torus',
                            label: 'Torus',
                            icon: <Circle size={11} strokeWidth={1.5} />,
                            actions: rowActions,
                          },
                          {
                            id: 'cylinder',
                            label: 'Cylinder',
                            icon: <Database size={11} strokeWidth={1.5} />,
                            actions: rowActions,
                          },
                        ],
                      },
                      {
                        id: 'lights',
                        label: 'Lights',
                        icon: <Lightbulb size={11} strokeWidth={1.5} />,
                        children: [
                          {
                            id: 'point1',
                            label: 'Point Light',
                            icon: <Lightbulb size={11} strokeWidth={1.5} />,
                            actions: rowActions,
                          },
                          {
                            id: 'spot1',
                            label: 'Spot Light',
                            icon: <Flame size={11} strokeWidth={1.5} />,
                            actions: rowActions,
                          },
                          {
                            id: 'area1',
                            label: 'Area Light',
                            icon: <Monitor size={11} strokeWidth={1.5} />,
                            actions: rowActions,
                          },
                        ],
                      },
                      {
                        id: 'cameras',
                        label: 'Cameras',
                        icon: <Video size={11} strokeWidth={1.5} />,
                        children: [
                          {
                            id: 'cam1',
                            label: 'Main Camera',
                            icon: <Camera size={11} strokeWidth={1.5} />,
                            actions: rowActions,
                          },
                          {
                            id: 'cam2',
                            label: 'Cinematic Cam',
                            icon: <Film size={11} strokeWidth={1.5} />,
                            actions: rowActions,
                          },
                        ],
                      },
                      {
                        id: 'fx',
                        label: 'Effects',
                        icon: <Zap size={11} strokeWidth={1.5} />,
                        children: [
                          {
                            id: 'particle1',
                            label: 'Fire Particles',
                            icon: <Flame size={11} strokeWidth={1.5} />,
                            actions: rowActions,
                          },
                          {
                            id: 'particle2',
                            label: 'Rain Drops',
                            icon: <Droplets size={11} strokeWidth={1.5} />,
                            actions: rowActions,
                          },
                          {
                            id: 'particle3',
                            label: 'Snow',
                            icon: <Snowflake size={11} strokeWidth={1.5} />,
                            actions: rowActions,
                          },
                        ],
                      },
                      {
                        id: 'audio',
                        label: 'Audio',
                        icon: <Music size={11} strokeWidth={1.5} />,
                        children: [
                          { id: 'bgm', label: 'Background Music', icon: <Speaker size={11} strokeWidth={1.5} /> },
                          { id: 'sfx', label: 'SFX Emitter', icon: <Mic size={11} strokeWidth={1.5} /> },
                        ],
                      },
                    ],
                  },
                ]}
              />
            </div>

            {/* Bottom action bar */}
            <div className="flex items-center gap-1 px-1.5 py-1 border-t border-[#1e1e1e]">
              <Tooltip content="Add Object">
                <Button variant="ghost" size="sm">
                  <Plus size={11} />
                </Button>
              </Tooltip>
              <Tooltip content="Delete">
                <Button variant="ghost" size="sm">
                  <Minus size={11} />
                </Button>
              </Tooltip>
              <Tooltip content="Duplicate">
                <Button variant="ghost" size="sm">
                  <Copy size={11} />
                </Button>
              </Tooltip>
              <div className="flex-1" />
              <Tooltip content="Filter">
                <Button variant="ghost" size="sm">
                  <Filter size={11} />
                </Button>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* ===== CENTER: Viewport + Timeline + Console ===== */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Viewport */}
          <div className="flex-1 bg-[#353535] relative" onContextMenu={ctx.onContextMenu}>
            <ViewportOverlay
              info="User Perspective"
              subInfo={`(1) Main Scene | ${treeSelected.charAt(0).toUpperCase() + treeSelected.slice(1)}`}
              className="absolute top-2 left-3"
            />

            {/* Viewport top-right controls */}
            <div className="absolute top-2 right-2 flex gap-1.5 items-start">
              {/* View mode selector */}
              <SegmentedControl
                options={[
                  { value: 'wireframe', label: 'Wire' },
                  { value: 'solid', label: 'Solid' },
                  { value: 'material', label: 'Material' },
                  { value: 'rendered', label: 'Rendered' },
                ]}
                value="solid"
              />
              {/* Overlay toggle */}
              <Tooltip content="Viewport Overlays">
                <button
                  className={`w-6 h-6 flex items-center justify-center rounded-[3px] cursor-default ${
                    overlayOpen ? 'bg-[#2d8ceb] text-white' : 'bg-[#3c3c3c]/80 text-[#999999] hover:text-[#cccccc]'
                  }`}
                  onClick={() => setOverlayOpen((o) => !o)}
                >
                  <Layers size={12} />
                </button>
              </Tooltip>
            </div>

            {/* Right gizmo strip */}
            <GizmoStrip
              className="absolute right-2 top-1/2 -translate-y-1/2"
              items={[
                { icon: <Crosshair size={13} />, label: 'Gizmos' },
                { icon: <Hand size={13} />, label: 'Pan' },
                { icon: <Eye size={13} />, label: 'Overlays' },
                { icon: <Grid3x3 size={13} />, label: 'Shading' },
              ]}
            />

            {/* Viewport camera info */}
            <div className="absolute bottom-2 left-3 flex gap-4 text-[10px] text-[#555555]">
              <span>X: {pos.x.toFixed(2)}</span>
              <span>Y: {pos.y.toFixed(2)}</span>
              <span>Z: {pos.z.toFixed(2)}</span>
              <span className="ml-2">FOV: {fov}°</span>
            </div>

            {/* Viewport center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[#555555] text-[13px] select-none">Right-click for context menu</span>
            </div>

            {/* Overlay panel */}
            {overlayOpen && (
              <div className="absolute top-10 right-2 w-[270px] bg-[#2b2b2b] border border-[#3b3b3b] rounded-[3px] shadow-lg shadow-black/40 text-[11px]">
                <div className="px-2.5 py-1.5 border-b border-[#3b3b3b] flex items-center justify-between">
                  <span className="text-[#cccccc]">Viewport Overlays</span>
                  <Toggle checked />
                </div>
                <div className="px-2.5 py-1.5 border-b border-[#3b3b3b]">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Checkbox id="ov-gizmo2" label="Gizmo" checked />
                  </div>
                  <SegmentedControl
                    options={[
                      { value: 'nav', label: 'Navigate' },
                      { value: 'active', label: 'Active Object' },
                      { value: 'tools', label: 'Active Tools' },
                    ]}
                    value="active"
                  />
                </div>
                <div className="px-2.5 py-1.5 border-b border-[#3b3b3b]">
                  <div className="text-[10px] text-[#999999] mb-1">Guides</div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    <Checkbox id="ov2-grid" label="Grid" checked />
                    <Checkbox id="ov2-3dcursor" label="3D Cursor" checked />
                    <Checkbox id="ov2-text" label="Text Info" checked />
                    <Checkbox id="ov2-annotations" label="Annotations" checked />
                    <Checkbox id="ov2-floor" label="Floor Grid" checked />
                    <Checkbox id="ov2-axis" label="Axis Lines" checked />
                  </div>
                </div>
                <div className="px-2.5 py-1.5 border-b border-[#3b3b3b]">
                  <div className="text-[10px] text-[#999999] mb-1">Objects</div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    <Checkbox id="ov2-extras" label="Extras" checked />
                    <Checkbox id="ov2-bones" label="Bones" checked />
                    <Checkbox id="ov2-outline" label="Outline Selected" checked />
                    <Checkbox id="ov2-origins" label="Origins" checked />
                    <Checkbox id="ov2-wireframe" label="Wireframes" />
                    <Checkbox id="ov2-normals" label="Normals" />
                  </div>
                </div>
                <div className="px-2.5 py-1.5">
                  <div className="text-[10px] text-[#999999] mb-1">Post Processing</div>
                  <div className="space-y-1.5">
                    <Slider label="Brightness" value={brightness} onChange={(e) => setBrightness(e.target.value)} />
                    <Slider label="Contrast" value={contrast} onChange={(e) => setContrast(e.target.value)} />
                    <Slider label="Saturation" value={saturation} onChange={(e) => setSaturation(e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            <ContextMenu
              pos={ctx.pos}
              onClose={ctx.close}
              items={[
                { label: 'Add Cube', shortcut: 'Shift+A', action: () => toast('Cube added', 'info') },
                { label: 'Add Sphere', action: () => toast('Sphere added', 'info') },
                { label: 'Add Cylinder', action: () => toast('Cylinder added', 'info') },
                { label: 'Add Empty', action: () => toast('Empty added', 'info') },
                { separator: true },
                { label: 'Duplicate', shortcut: 'Shift+D', action: () => toast('Duplicated', 'info') },
                { label: 'Copy', shortcut: 'Ctrl+C' },
                { label: 'Paste', shortcut: 'Ctrl+V' },
                { separator: true },
                { label: 'Select All', shortcut: 'A' },
                { label: 'Select Linked', shortcut: 'L' },
                { label: 'Select None', shortcut: 'Alt+A' },
                { separator: true },
                { label: 'Hide Selected', shortcut: 'H' },
                { label: 'Delete', shortcut: 'X', action: () => toast('Deleted', 'error') },
              ]}
            />
          </div>

          {/* Bottom section: Timeline + Console tabs */}
          <div className="h-[180px] shrink-0 flex flex-col bg-[#2b2b2b] border-t border-[#1e1e1e]">
            {/* Bottom tabs */}
            <div className="flex items-center bg-[#323232] border-b border-[#1e1e1e] h-5">
              {['Timeline', 'Console', 'Output', 'Curves', 'Drivers'].map((tab) => (
                <button
                  key={tab}
                  className={`px-3 h-5 text-[10px] cursor-default ${
                    activeBottomTab === tab.toLowerCase()
                      ? 'bg-[#2b2b2b] text-[#cccccc] border-b border-[#2d8ceb]'
                      : 'text-[#999999] hover:text-[#cccccc]'
                  }`}
                  onClick={() => setActiveBottomTab(tab.toLowerCase())}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeBottomTab === 'timeline' && (
              <div className="flex-1 flex flex-col">
                <div className="flex items-center px-1.5 py-1 gap-1">
                  <TransportControls
                    icons={{
                      jumpToStart: <ChevronsLeft size={11} />,
                      stepBack: <SkipBack size={11} />,
                      play: <Play size={11} />,
                      pause: <Pause size={11} />,
                      stepForward: <SkipForward size={11} />,
                      jumpToEnd: <ChevronsRight size={11} />,
                    }}
                    playing={playing}
                    frame={frame}
                    totalFrames={250}
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                    onFrameChange={setFrame}
                    className="flex-1"
                  />
                </div>
                {/* Keyframe tracks */}
                <div className="flex-1 overflow-y-auto px-1.5">
                  {['Position', 'Rotation', 'Scale', 'Opacity', 'Color'].map((track) => (
                    <div key={track} className="flex items-center h-5 gap-2 border-b border-[#3b3b3b]/50">
                      <span className="text-[10px] text-[#999999] w-16 shrink-0 truncate">{track}</span>
                      <div className="flex-1 h-full relative">
                        <div className="absolute inset-y-0 left-0 right-0 flex items-center gap-[2px]">
                          {Array.from({ length: 5 }, (_, i) => (
                            <div
                              key={i}
                              className="flex items-center"
                              style={{ marginLeft: `${Math.random() * 80 + 10}%`, position: 'absolute' }}
                            >
                              <KeyframeDot active={Math.random() > 0.5} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeBottomTab === 'console' && (
              <Scrollbar maxHeight={140} className="flex-1">
                <div className="p-2 text-[10px] font-mono space-y-0.5">
                  <div className="text-[#55b855]">[INFO] Scene loaded: Main Scene (12 objects)</div>
                  <div className="text-[#55b855]">[INFO] Renderer: Fisher GPU v0.1.0</div>
                  <div className="text-[#cccccc]">[LOG] Compiling shaders... 24/24 complete</div>
                  <div className="text-[#cc8833]">[WARN] Texture "ground_albedo.png" exceeds 4K resolution</div>
                  <div className="text-[#cccccc]">[LOG] Physics simulation initialized (Bullet 3.25)</div>
                  <div className="text-[#55b855]">[INFO] Lightmap bake complete: 4 lights, 2048x2048</div>
                  <div className="text-[#e05555]">[ERROR] Material "Glass_Broken" missing normal map</div>
                  <div className="text-[#cccccc]">[LOG] Frame {frame}: 16.2ms (61.7 FPS)</div>
                  <div className="text-[#cc8833]">[WARN] Memory usage: 1.8 GB / 4.0 GB (45%)</div>
                  <div className="text-[#55b855]">[INFO] Auto-save: project_backup_048.fisher</div>
                  <div className="text-[#cccccc]">[LOG] Object selected: {treeSelected}</div>
                </div>
              </Scrollbar>
            )}

            {activeBottomTab === 'output' && (
              <div className="flex-1 p-2">
                <Progress label="Render Progress" value={72} />
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <div>
                    <Progress label="Geometry" value={100} />
                  </div>
                  <div>
                    <Progress label="Lighting" value={85} />
                  </div>
                  <div>
                    <Progress label="Post FX" value={40} />
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Skeleton width={60} height={40} />
                  <Skeleton width={60} height={40} />
                  <Skeleton width={60} height={40} />
                  <Skeleton width={60} height={40} />
                </div>
              </div>
            )}

            {activeBottomTab === 'curves' && (
              <div className="flex-1 flex items-center justify-center text-[11px] text-[#555555]">
                Select a keyframed property to edit curves
              </div>
            )}

            {activeBottomTab === 'drivers' && (
              <div className="flex-1 flex items-center justify-center text-[11px] text-[#555555]">
                No drivers configured
              </div>
            )}
          </div>
        </div>

        {/* ===== RIGHT: Outliner + Properties ===== */}
        <div className="w-[300px] shrink-0 flex flex-col border-l border-[#1e1e1e] overflow-hidden">
          {/* Outliner */}
          <Outliner
            className="h-[160px] shrink-0 border-b border-[#1e1e1e]"
            searchIcon={<Search size={11} />}
            filterIcon={<Filter size={11} />}
            nodes={[
              {
                id: 's1',
                label: 'Scene Collection',
                icon: <FolderOpen {...IS} />,
                expanded: true,
                children: [
                  {
                    id: 'c1',
                    label: 'Collection',
                    icon: <Layers {...IS} />,
                    expanded: true,
                    actions: <IconToggle icon={<Eye size={10} strokeWidth={1.5} />} checked />,
                    children: [
                      { id: 'o-cam', label: 'Main Camera', icon: <Camera {...IS} />, actions: rowActions },
                      { id: 'o-cube', label: 'Cube', icon: <Box {...IS} />, actions: rowActions },
                      { id: 'o-sphere', label: 'Sphere', icon: <Circle {...IS} />, actions: rowActions },
                      { id: 'o-light', label: 'Sun Light', icon: <Sun {...IS} />, actions: rowActions },
                      { id: 'o-plane', label: 'Ground Plane', icon: <Minus {...IS} />, actions: rowActions },
                    ],
                  },
                ],
              },
            ]}
            selected={treeSelected}
            onSelect={(n) => setTreeSelected(n.id)}
          />

          {/* Properties */}
          <div className="flex-1 flex min-h-0">
            {/* Icon tab strip */}
            <IconTabStrip
              className="w-7 shrink-0 bg-[#303030] border-r border-[#1e1e1e]"
              value={activePropTab}
              onChange={setActivePropTab}
              tabs={[
                { id: 'scene', icon: <Database {...IS} />, label: 'Scene' },
                { id: 'world', icon: <Globe {...IS} />, label: 'World' },
                { id: 'object', icon: <Box {...IS} />, label: 'Object Properties' },
                { id: 'modifiers', icon: <Wrench {...IS} />, label: 'Modifiers' },
                { id: 'particles', icon: <Zap {...IS} />, label: 'Particles' },
                { id: 'physics', icon: <Magnet {...IS} />, label: 'Physics' },
                { id: 'constraints', icon: <Lock {...IS} />, label: 'Constraints' },
                { id: 'data', icon: <Grid3x3 {...IS} />, label: 'Object Data' },
                { id: 'material', icon: <Gem {...IS} />, label: 'Material' },
                { id: 'render', icon: <Image {...IS} />, label: 'Render' },
                { id: 'output', icon: <Download {...IS} />, label: 'Output' },
              ]}
            />

            {/* Properties content */}
            <div className="flex-1 bg-[#2b2b2b] overflow-y-auto">
              {/* Object header */}
              <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-[#3b3b3b]">
                <Box size={11} className="text-[#999999]" />
                <span className="text-[12px] text-[#cccccc] flex-1">Cube</span>
                <Badge className="text-[9px] bg-[#535353] text-[#999999] px-1 py-0 rounded-[2px]">Mesh</Badge>
                <IconToggle icon={<Pin size={10} strokeWidth={1.5} />} tooltip="Pin" />
              </div>

              {activePropTab === 'object' && (
                <>
                  {/* Transform */}
                  <PropertyPanel title="Transform" draggable onToggle={() => {}}>
                    <div className="space-y-1">
                      <PropertyRow
                        label="Location"
                        actions={
                          <>
                            <IconToggle icon={<Lock size={9} strokeWidth={1.5} />} tooltip="Lock" />
                            <KeyframeDot active />
                          </>
                        }
                      >
                        <VectorInput value={pos} step={0.1} onChange={setPos} />
                      </PropertyRow>
                      <PropertyRow
                        label="Rotation"
                        actions={
                          <>
                            <IconToggle icon={<Lock size={9} strokeWidth={1.5} />} tooltip="Lock" />
                            <KeyframeDot />
                          </>
                        }
                      >
                        <VectorInput value={rot} step={1} onChange={setRot} />
                      </PropertyRow>
                      <PropertyRow
                        label="Scale"
                        actions={
                          <>
                            <IconToggle icon={<Lock size={9} strokeWidth={1.5} />} tooltip="Lock" />
                            <KeyframeDot />
                          </>
                        }
                      >
                        <VectorInput value={scl} step={0.1} onChange={setScl} />
                      </PropertyRow>
                      <PropertyRow label="Mode">
                        <Select
                          id="rot-mode2"
                          options={[
                            { value: 'xyz', label: 'XYZ Euler' },
                            { value: 'xzy', label: 'XZY Euler' },
                            { value: 'quat', label: 'Quaternion' },
                            { value: 'axis', label: 'Axis Angle' },
                          ]}
                        />
                      </PropertyRow>
                    </div>
                  </PropertyPanel>

                  {/* Viewport Display */}
                  <PropertyPanel title="Viewport Display" draggable onToggle={() => {}}>
                    <PropertyRow label="Color">
                      <ColorPicker value={col1} onChange={(e) => setCol1(e.target.value)} />
                    </PropertyRow>
                    <PropertyRow label="Display As">
                      <Select
                        id="disp2"
                        options={[
                          { value: 'solid', label: 'Solid' },
                          { value: 'wire', label: 'Wire' },
                          { value: 'bounds', label: 'Bounds' },
                          { value: 'textured', label: 'Textured' },
                        ]}
                      />
                    </PropertyRow>
                    <PropertyRow label="Wireframe">
                      <Slider value={opacity} max={100} onChange={(e) => setOpacity(e.target.value)} />
                    </PropertyRow>
                    <PropertyRow label="Shadows">
                      <Checkbox id="cast2" label="Cast" checked />
                    </PropertyRow>
                    <PropertyRow label="">
                      <Checkbox id="recv2" label="Receive" checked />
                    </PropertyRow>
                  </PropertyPanel>

                  {/* Relations */}
                  <PropertyPanel title="Relations" draggable onToggle={() => {}}>
                    <PropertyRow label="Parent">
                      <span className="text-[11px] text-[#666666]">None</span>
                    </PropertyRow>
                    <PropertyRow label="Collection">
                      <span className="text-[11px] text-[#cccccc]">Collection</span>
                    </PropertyRow>
                    <PropertyRow label="Pass Index">
                      <NumberInput id="pidx" value={0} min={0} step={1} />
                    </PropertyRow>
                  </PropertyPanel>

                  {/* Visibility */}
                  <PropertyPanel title="Visibility" draggable onToggle={() => {}}>
                    <PropertyRow label="Show In">
                      <SegmentedControl
                        options={[
                          { value: 'viewport', label: 'Viewports' },
                          { value: 'render', label: 'Renders' },
                        ]}
                        value="viewport"
                      />
                    </PropertyRow>
                    <PropertyRow label="Selectable">
                      <Checkbox id="vis-sel2" checked />
                    </PropertyRow>
                    <PropertyRow label="Holdout">
                      <Checkbox id="holdout" />
                    </PropertyRow>
                    <PropertyRow label="Shadow Catcher">
                      <Checkbox id="shadow-catch" />
                    </PropertyRow>
                  </PropertyPanel>
                </>
              )}

              {activePropTab === 'material' && (
                <>
                  <PropertyPanel title="Surface" draggable onToggle={() => {}}>
                    <PropertyRow label="Shader">
                      <div className="space-y-1.5">
                        <Radio
                          id="sh-pbr"
                          name="shader2"
                          value="pbr"
                          label="PBR Standard"
                          checked={radio === 'pbr'}
                          onChange={() => setRadio('pbr')}
                        />
                        <Radio
                          id="sh-unlit"
                          name="shader2"
                          value="unlit"
                          label="Unlit"
                          checked={radio === 'unlit'}
                          onChange={() => setRadio('unlit')}
                        />
                        <Radio
                          id="sh-toon"
                          name="shader2"
                          value="toon"
                          label="Toon"
                          checked={radio === 'toon'}
                          onChange={() => setRadio('toon')}
                        />
                      </div>
                    </PropertyRow>
                    <PropertyRow label="Base Color">
                      <ColorPicker value={col1} onChange={(e) => setCol1(e.target.value)} />
                    </PropertyRow>
                    <PropertyRow label="Roughness" actions={<KeyframeDot />}>
                      <Slider value={roughness} onChange={(e) => setRoughness(e.target.value)} />
                    </PropertyRow>
                    <PropertyRow label="Metallic" actions={<KeyframeDot />}>
                      <Slider value={metallic} onChange={(e) => setMetallic(e.target.value)} />
                    </PropertyRow>
                    <PropertyRow label="Emission">
                      <Slider value={emission} onChange={(e) => setEmission(e.target.value)} />
                    </PropertyRow>
                    <PropertyRow label="Emission Color">
                      <ColorPicker value={col3} onChange={(e) => setCol3(e.target.value)} />
                    </PropertyRow>
                    <PropertyRow label="Opacity" actions={<KeyframeDot />}>
                      <Slider value={opacity} max={100} onChange={(e) => setOpacity(e.target.value)} />
                    </PropertyRow>
                    <PropertyRow label="Alpha Clip">
                      <Toggle />
                    </PropertyRow>
                  </PropertyPanel>

                  <PropertyPanel title="Normal Map" draggable onToggle={() => {}}>
                    <PropertyRow label="Texture">
                      <span className="text-[11px] text-[#666666]">None</span>
                    </PropertyRow>
                    <PropertyRow label="Strength">
                      <Slider value={100} />
                    </PropertyRow>
                    <PropertyRow label="Flip Y">
                      <Checkbox id="flip-y" />
                    </PropertyRow>
                  </PropertyPanel>
                </>
              )}

              {activePropTab === 'physics' && (
                <>
                  <PropertyPanel title="Rigid Body" draggable onToggle={() => {}}>
                    <PropertyRow label="Type">
                      <Select
                        id="rb-type"
                        options={[
                          { value: 'active', label: 'Active' },
                          { value: 'passive', label: 'Passive' },
                          { value: 'kinematic', label: 'Kinematic' },
                        ]}
                      />
                    </PropertyRow>
                    <PropertyRow label="Mass">
                      <NumberInput
                        id="rb-mass"
                        value={mass}
                        min={0}
                        step={0.1}
                        onChange={(e) => setMass(e.target.value)}
                      />
                    </PropertyRow>
                    <PropertyRow label="Friction">
                      <Slider value={friction} onChange={(e) => setFriction(e.target.value)} />
                    </PropertyRow>
                    <PropertyRow label="Bounciness">
                      <Slider value={bounce} onChange={(e) => setBounce(e.target.value)} />
                    </PropertyRow>
                    <PropertyRow label="Gravity">
                      <Toggle checked />
                    </PropertyRow>
                    <PropertyRow label="Collision">
                      <Select
                        id="col-shape"
                        options={[
                          { value: 'box', label: 'Box' },
                          { value: 'sphere', label: 'Sphere' },
                          { value: 'capsule', label: 'Capsule' },
                          { value: 'mesh', label: 'Mesh' },
                          { value: 'convex', label: 'Convex Hull' },
                        ]}
                      />
                    </PropertyRow>
                  </PropertyPanel>

                  <PropertyPanel title="Fluid" draggable onToggle={() => {}}>
                    <PropertyRow label="Enable">
                      <Toggle />
                    </PropertyRow>
                    <PropertyRow label="Density">
                      <NumberInput
                        id="fl-density"
                        value={density}
                        step={10}
                        onChange={(e) => setDensity(e.target.value)}
                      />
                    </PropertyRow>
                    <PropertyRow label="Viscosity">
                      <Slider value={10} />
                    </PropertyRow>
                    <PropertyRow label="Velocity">
                      <VectorInput value={vel} step={0.1} onChange={setVel} />
                    </PropertyRow>
                  </PropertyPanel>
                </>
              )}

              {activePropTab === 'render' && (
                <>
                  <PropertyPanel title="Render Engine" draggable onToggle={() => {}}>
                    <PropertyRow label="Engine">
                      <Select
                        id="render-engine"
                        options={[
                          { value: 'fisher', label: 'Fisher RT' },
                          { value: 'pathtracer', label: 'Path Tracer' },
                          { value: 'raster', label: 'Rasterizer' },
                        ]}
                      />
                    </PropertyRow>
                    <PropertyRow label="Samples">
                      <NumberInput id="samples" value={128} min={1} max={4096} step={1} />
                    </PropertyRow>
                    <PropertyRow label="Denoise">
                      <Toggle checked />
                    </PropertyRow>
                  </PropertyPanel>

                  <PropertyPanel title="Camera" draggable onToggle={() => {}}>
                    <PropertyRow label="FOV">
                      <Slider value={fov} min={10} max={120} onChange={(e) => setFov(e.target.value)} />
                    </PropertyRow>
                    <PropertyRow label="Near Clip">
                      <NumberInput
                        id="near"
                        value={near}
                        min={0.001}
                        step={0.01}
                        onChange={(e) => setNear(e.target.value)}
                      />
                    </PropertyRow>
                    <PropertyRow label="Far Clip">
                      <NumberInput id="far" value={far} min={1} step={10} onChange={(e) => setFar(e.target.value)} />
                    </PropertyRow>
                    <PropertyRow label="Depth of Field">
                      <Toggle />
                    </PropertyRow>
                    <PropertyRow label="Aperture">
                      <Slider value={22} max={100} />
                    </PropertyRow>
                  </PropertyPanel>

                  <PropertyPanel title="Color Management" draggable onToggle={() => {}}>
                    <PropertyRow label="Exposure">
                      <Slider value={brightness} onChange={(e) => setBrightness(e.target.value)} />
                    </PropertyRow>
                    <PropertyRow label="Gamma">
                      <Slider value={50} />
                    </PropertyRow>
                    <PropertyRow label="Temperature">
                      <NumberInput
                        id="temp"
                        value={temperature}
                        min={1000}
                        max={12000}
                        step={100}
                        onChange={(e) => setTemperature(e.target.value)}
                      />
                    </PropertyRow>
                    <PropertyRow label="Look">
                      <Select
                        id="look"
                        options={[
                          { value: 'none', label: 'None' },
                          { value: 'filmic', label: 'Filmic' },
                          { value: 'aces', label: 'ACES' },
                          { value: 'agx', label: 'AgX' },
                        ]}
                      />
                    </PropertyRow>
                  </PropertyPanel>

                  <PropertyPanel title="Output" draggable onToggle={() => {}}>
                    <PropertyRow label="Resolution">
                      <VectorInput value={{ x: 1920, y: 1080 }} axes={['x', 'y']} step={1} />
                    </PropertyRow>
                    <PropertyRow label="Format">
                      <Select
                        id="format"
                        options={[
                          { value: 'png', label: 'PNG' },
                          { value: 'jpg', label: 'JPEG' },
                          { value: 'exr', label: 'OpenEXR' },
                          { value: 'tiff', label: 'TIFF' },
                        ]}
                      />
                    </PropertyRow>
                    <PropertyRow label="Quality">
                      <Slider value={90} />
                    </PropertyRow>
                  </PropertyPanel>
                </>
              )}

              {activePropTab === 'scene' && (
                <>
                  <PropertyPanel title="Scene" draggable onToggle={() => {}}>
                    <PropertyRow label="Name">
                      <Input
                        id="scene-name"
                        placeholder="Main Scene"
                        className="w-full bg-[#383838] text-[#cccccc] text-[11px] px-2 py-0.5 border border-[#3b3b3b] rounded-[3px] outline-none focus:border-[#2d8ceb]"
                      />
                    </PropertyRow>
                    <PropertyRow label="Camera">
                      <Select
                        id="scene-cam"
                        icon={<Camera {...IS} />}
                        options={[
                          { value: 'main', label: 'Main Camera', icon: <Camera {...IS} /> },
                          { value: 'cine', label: 'Cinematic Cam', icon: <Film {...IS} /> },
                        ]}
                      />
                    </PropertyRow>
                  </PropertyPanel>

                  <PropertyPanel title="Units" draggable onToggle={() => {}}>
                    <PropertyRow label="System">
                      <Select
                        id="unit-sys"
                        options={[
                          { value: 'metric', label: 'Metric' },
                          { value: 'imperial', label: 'Imperial' },
                          { value: 'none', label: 'None' },
                        ]}
                      />
                    </PropertyRow>
                    <PropertyRow label="Length">
                      <Select
                        id="unit-len"
                        options={[
                          { value: 'm', label: 'Meters' },
                          { value: 'cm', label: 'Centimeters' },
                          { value: 'mm', label: 'Millimeters' },
                          { value: 'ft', label: 'Feet' },
                        ]}
                      />
                    </PropertyRow>
                    <PropertyRow label="Scale">
                      <NumberInput id="unit-scale" value={1} min={0.001} step={0.001} />
                    </PropertyRow>
                  </PropertyPanel>

                  <PropertyPanel title="Gravity" draggable onToggle={() => {}}>
                    <PropertyRow label="Enable">
                      <Checkbox id="grav-enable" label="Active" checked />
                    </PropertyRow>
                    <PropertyRow label="Direction">
                      <VectorInput value={{ x: 0, y: -9.81, z: 0 }} step={0.01} />
                    </PropertyRow>
                  </PropertyPanel>

                  <PropertyPanel title="Audio" draggable onToggle={() => {}}>
                    <PropertyRow label="Volume">
                      <Slider value={volume} onChange={(e) => setVolume(e.target.value)} />
                    </PropertyRow>
                    <PropertyRow label="Distance Model">
                      <Select
                        id="audio-dist"
                        options={[
                          { value: 'linear', label: 'Linear' },
                          { value: 'inverse', label: 'Inverse' },
                          { value: 'expo', label: 'Exponential' },
                        ]}
                      />
                    </PropertyRow>
                    <PropertyRow label="Doppler">
                      <Toggle checked />
                    </PropertyRow>
                  </PropertyPanel>
                </>
              )}

              {!['object', 'material', 'physics', 'render', 'scene'].includes(activePropTab) && (
                <div className="flex flex-col items-center justify-center py-8 text-[11px] text-[#555555] gap-2">
                  <span>No {propTabs?.find?.((t) => t?.id === activePropTab)?.label ?? activePropTab} data</span>
                  <Button variant="secondary" size="sm" onClick={() => toast(`Added ${activePropTab}`, 'info')}>
                    <Plus size={10} className="inline mr-1" />
                    Add
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar
        left={[
          <span key="s" className="text-[#cccccc]">
            Select
          </span>,
          'Rotate View',
          'Pan',
          'Object',
        ]}
        right={[
          `Scene: Main Scene`,
          `Objects: 12`,
          `Verts: 24,576`,
          `Faces: 12,288`,
          `Tris: 24,576`,
          `Memory: 1.8 GB`,
          `61.7 FPS`,
          `Fisher v0.1.0`,
        ]}
      />

      {/* Preferences Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        className="bg-[#2b2b2b] border border-[#3b3b3b] rounded-[3px] p-0 shadow-lg shadow-black/40 backdrop:bg-black/50 w-[500px]"
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#3b3b3b]">
          <span className="text-[12px]">Preferences</span>
          <button className="text-[#999999] hover:text-[#cccccc] cursor-default" onClick={() => setModalOpen(false)}>
            <XCircle size={14} />
          </button>
        </div>
        <div className="flex min-h-[300px]">
          <div className="w-[130px] bg-[#323232] border-r border-[#3b3b3b] py-1">
            {['Interface', 'Viewport', 'Keymap', 'System', 'Save & Load', 'Addons'].map((item, i) => (
              <button
                key={item}
                className={`w-full text-left px-3 py-1 text-[11px] cursor-default ${i === 0 ? 'bg-[#2d8ceb] text-white' : 'text-[#999999] hover:bg-[#404040]'}`}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="flex-1 p-3 space-y-3 overflow-y-auto">
            <PropertyPanel title="Appearance" onToggle={() => {}}>
              <PropertyRow label="Theme">
                <Select
                  id="pref-theme"
                  options={[
                    { value: 'dark', label: 'Dark' },
                    { value: 'light', label: 'Light' },
                    { value: 'midnight', label: 'Midnight' },
                  ]}
                />
              </PropertyRow>
              <PropertyRow label="Font Size">
                <NumberInput id="font-size" value={12} min={8} max={24} step={1} />
              </PropertyRow>
              <PropertyRow label="Accent">
                <ColorPicker value={col1} onChange={(e) => setCol1(e.target.value)} />
              </PropertyRow>
              <PropertyRow label="Animations">
                <Toggle checked />
              </PropertyRow>
              <PropertyRow label="Tooltips">
                <Toggle checked />
              </PropertyRow>
            </PropertyPanel>
            <PropertyPanel title="Viewport" onToggle={() => {}}>
              <PropertyRow label="Anti-alias">
                <Checkbox id="pref-aa" label="MSAA 4x" checked />
              </PropertyRow>
              <PropertyRow label="VSync">
                <Toggle checked />
              </PropertyRow>
              <PropertyRow label="FPS Limit">
                <NumberInput id="fps-limit" value={60} min={30} max={240} step={1} />
              </PropertyRow>
            </PropertyPanel>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Delete Object?"
        message="This will permanently remove the selected object and all its children. This action cannot be undone."
        onConfirm={() => toast('Object deleted', 'error')}
        confirmLabel="Delete"
      />
    </div>
  )
}

const propTabs = [
  { id: 'scene', label: 'Scene' },
  { id: 'world', label: 'World' },
  { id: 'object', label: 'Object Properties' },
  { id: 'modifiers', label: 'Modifiers' },
  { id: 'particles', label: 'Particles' },
  { id: 'physics', label: 'Physics' },
  { id: 'constraints', label: 'Constraints' },
  { id: 'data', label: 'Object Data' },
  { id: 'material', label: 'Material' },
  { id: 'render', label: 'Render' },
  { id: 'output', label: 'Output' },
]

export default function Root() {
  return (
    <ToastProvider>
      <App />
    </ToastProvider>
  )
}
