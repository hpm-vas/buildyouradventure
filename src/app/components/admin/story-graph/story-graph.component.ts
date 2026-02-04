import { Component, inject, signal, output, effect, ElementRef, viewChild, AfterViewInit, OnDestroy } from '@angular/core';
import cytoscape, { Core, NodeSingular } from 'cytoscape';
// @ts-ignore - cytoscape-dagre doesn't have types
import dagre from 'cytoscape-dagre';
import { AdminStoryService, StoryNodeRecord } from '../../../services/admin-story.service';

// Register dagre layout
cytoscape.use(dagre);

/**
 * Component for visualizing story nodes and their connections
 * Uses Cytoscape.js with dagre layout for hierarchical top-down display
 */
@Component({
  selector: 'app-story-graph',
  standalone: true,
  template: `
    <div class="graph-container">
      <div class="graph-toolbar">
        <button class="btn-tool" (click)="fitGraph()" title="Fit to view">📐</button>
        <button class="btn-tool" (click)="zoomIn()" title="Zoom in">🔍+</button>
        <button class="btn-tool" (click)="zoomOut()" title="Zoom out">🔍−</button>
        <button class="btn-tool" (click)="relayout()" title="Re-layout">🔄</button>
      </div>
      <div #graphContainer class="cytoscape-container"></div>
      <div class="graph-legend">
        <span class="legend-item"><span class="dot start"></span> Start</span>
        <span class="legend-item"><span class="dot complete"></span> Complete</span>
        <span class="legend-item"><span class="dot dummy"></span> Placeholder</span>
        <span class="legend-item"><span class="dot selected"></span> Selected</span>
      </div>
    </div>
  `,
  styles: [`
    .graph-container {
      height: 100%;
      display: flex;
      flex-direction: column;
      background: #1a1a2e;
      border-radius: 12px;
      overflow: hidden;
    }

    .graph-toolbar {
      display: flex;
      gap: 0.5rem;
      padding: 0.75rem;
      background: #16213e;
      border-bottom: 1px solid #333;
    }

    .btn-tool {
      padding: 0.5rem 0.75rem;
      font-size: 1rem;
      border: 1px solid #333;
      border-radius: 6px;
      background: transparent;
      color: #eaeaea;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        background: #0f3460;
        border-color: #e94560;
      }
    }

    .cytoscape-container {
      flex: 1;
      min-height: 300px;
    }

    .graph-legend {
      display: flex;
      gap: 1.5rem;
      padding: 0.75rem 1rem;
      background: #16213e;
      border-top: 1px solid #333;
      font-size: 0.85rem;
      color: #aaa;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid transparent;

      &.start {
        background: #4caf50;
        border-color: #81c784;
      }

      &.complete {
        background: #0f3460;
        border-color: #4da6ff;
      }

      &.dummy {
        background: transparent;
        border-color: #888;
        border-style: dashed;
      }

      &.selected {
        background: #e94560;
        border-color: #ff6b8a;
      }
    }
  `]
})
export class StoryGraphComponent implements AfterViewInit, OnDestroy {
  private readonly storyService = inject(AdminStoryService);
  
  readonly graphContainer = viewChild.required<ElementRef<HTMLDivElement>>('graphContainer');
  
  // Outputs
  readonly nodeSelected = output<string>();
  
  // Local state
  readonly selectedNodeId = signal<string | null>(null);
  
  private cy: Core | null = null;

  constructor() {
    // Re-render graph when data changes
    effect(() => {
      const nodes = this.storyService.nodes();
      const choices = this.storyService.choices();
      if (this.cy && nodes.length > 0) {
        this.updateGraph(nodes, choices);
      }
    });
  }

  ngAfterViewInit(): void {
    this.initGraph();
  }

  ngOnDestroy(): void {
    if (this.cy) {
      this.cy.destroy();
      this.cy = null;
    }
  }

  private initGraph(): void {
    const container = this.graphContainer().nativeElement;

    this.cy = cytoscape({
      container,
      style: [
        // Node styles
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'background-color': '#0f3460',
            'border-width': 2,
            'border-color': '#4da6ff',
            'color': '#eaeaea',
            'font-size': '11px',
            'width': 120,
            'height': 40,
            'shape': 'roundrectangle',
            'text-wrap': 'ellipsis',
            'text-max-width': '100px'
          }
        },
        // Start node
        {
          selector: 'node[?isStart]',
          style: {
            'background-color': '#4caf50',
            'border-color': '#81c784',
            'border-width': 3
          }
        },
        // Dummy/placeholder node
        {
          selector: 'node[?isDummy]',
          style: {
            'background-color': '#1a1a2e',
            'border-color': '#888',
            'border-style': 'dashed',
            'color': '#888'
          }
        },
        // Selected node
        {
          selector: 'node:selected',
          style: {
            'background-color': '#e94560',
            'border-color': '#ff6b8a',
            'border-width': 3
          }
        },
        // Edge styles
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#4da6ff',
            'target-arrow-color': '#4da6ff',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 0.8
          }
        },
        // Edge to dummy node
        {
          selector: 'edge[?toDummy]',
          style: {
            'line-color': '#888',
            'target-arrow-color': '#888',
            'line-style': 'dashed'
          }
        }
      ],
      layout: { name: 'grid' }, // Initial layout, will be replaced
      minZoom: 0.2,
      maxZoom: 3,
      wheelSensitivity: 0.3
    });

    // Handle node click
    this.cy.on('tap', 'node', (event) => {
      const node = event.target as NodeSingular;
      const nodeId = node.id();
      this.selectedNodeId.set(nodeId);
      this.nodeSelected.emit(nodeId);
    });

    // Handle background click to deselect
    this.cy.on('tap', (event) => {
      if (event.target === this.cy) {
        this.selectedNodeId.set(null);
      }
    });

    // Load initial data if available
    const nodes = this.storyService.nodes();
    const choices = this.storyService.choices();
    if (nodes.length > 0) {
      this.updateGraph(nodes, choices);
    }
  }

  private updateGraph(nodes: StoryNodeRecord[], choices: { node_id: string; next_node: string }[]): void {
    if (!this.cy) return;

    // Build node map for quick lookup
    const nodeKeyToId = new Map(nodes.map(n => [n.node_key, n.id]));

    // Create cytoscape elements
    const cyNodes = nodes.map(node => ({
      data: {
        id: node.id,
        label: node.title || node.node_key,
        nodeKey: node.node_key,
        isStart: node.is_start,
        isDummy: node.pending || !node.text || node.text === '<!-- Placeholder node - add content -->'
      }
    }));

    const cyEdges = choices
      .filter(choice => {
        // Only add edge if target node exists
        const targetId = nodeKeyToId.get(choice.next_node);
        return targetId !== undefined;
      })
      .map((choice, index) => {
        const targetId = nodeKeyToId.get(choice.next_node)!;
        const targetNode = nodes.find(n => n.id === targetId);
        const isDummy = targetNode?.pending || !targetNode?.text || targetNode?.text === '<!-- Placeholder node - add content -->';
        
        return {
          data: {
            id: `edge-${index}`,
            source: choice.node_id,
            target: targetId,
            toDummy: isDummy
          }
        };
      });

    // Update graph
    this.cy.elements().remove();
    this.cy.add([...cyNodes, ...cyEdges]);

    // Apply layout
    this.applyLayout();
  }

  private applyLayout(): void {
    if (!this.cy) return;

    this.cy.layout({
      name: 'dagre',
      rankDir: 'TB', // Top to bottom
      nodeSep: 50,
      rankSep: 80,
      padding: 30,
      animate: true,
      animationDuration: 300
    } as any).run();
  }

  // Public methods for toolbar
  fitGraph(): void {
    this.cy?.fit(undefined, 30);
  }

  zoomIn(): void {
    if (this.cy) {
      this.cy.zoom(this.cy.zoom() * 1.2);
    }
  }

  zoomOut(): void {
    if (this.cy) {
      this.cy.zoom(this.cy.zoom() / 1.2);
    }
  }

  relayout(): void {
    this.applyLayout();
  }

  /**
   * Select a node programmatically
   */
  selectNode(nodeId: string): void {
    if (!this.cy) return;

    this.cy.nodes().unselect();
    const node = this.cy.getElementById(nodeId);
    if (node) {
      node.select();
      this.cy.center(node);
    }
  }
}
