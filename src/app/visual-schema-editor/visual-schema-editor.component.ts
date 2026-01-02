import { Component, signal, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { DatabaseSchema, Table, Column, Relationship } from '../data';
import data from '../data';

interface TablePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

@Component({
  selector: 'app-visual-schema-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, MatToolbarModule, MatButtonModule, MatIconModule, 
           MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule, 
           MatCheckboxModule, MatChipsModule, MatExpansionModule, MatSidenavModule],
  templateUrl: './visual-schema-editor.component.html',
  styleUrls: ['./visual-schema-editor.component.css']
})
export class VisualSchemaEditorComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;
  
  schema = signal<DatabaseSchema>(structuredClone(data));
  selectedTable = signal<Table | null>(null);
  tablePositions = signal<Map<string, TablePosition>>(new Map());
  dragState = signal<{ isDragging: boolean; table: string | null; offsetX: number; offsetY: number }>({
    isDragging: false,
    table: null,
    offsetX: 0,
    offsetY: 0
  });
  canUndoSignal = signal<boolean>(false);
  canRedoSignal = signal<boolean>(false);

  private undoStack: { schema: DatabaseSchema; positions: Map<string, TablePosition> }[] = [];
  private redoStack: { schema: DatabaseSchema; positions: Map<string, TablePosition> }[] = [];
  private ctx!: CanvasRenderingContext2D;

  ngAfterViewInit() {
    this.ctx = this.canvas.nativeElement.getContext('2d')!;
    this.resizeCanvas();
    this.loadFromLocalStorage();
    this.initializeTablePositions();
    this.saveState();
    setTimeout(() => this.drawDiagram(), 0);
    
    // Add resize listener
    window.addEventListener('resize', () => this.handleResize());
  }

  handleResize() {
    this.resizeCanvas();
    // Re-initialize context after resize
    this.ctx = this.canvas.nativeElement.getContext('2d')!;
    this.drawDiagram();
  }

  resizeCanvas() {
    const container = this.canvas.nativeElement.parentElement!;
    const rect = container.getBoundingClientRect();
    const canvas = this.canvas.nativeElement;
    
    // Store current transform state
    const imageData = this.ctx ? this.ctx.getImageData(0, 0, canvas.width, canvas.height) : null;
    
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    // Restore context after resize
    if (imageData) {
      this.ctx = canvas.getContext('2d')!;
    }
  }

  initializeTablePositions() {
    const positions = new Map<string, TablePosition>();
    this.schema().tables.forEach((table, index) => {
      positions.set(table.tableName, {
        x: 50 + (index % 3) * 300,
        y: 50 + Math.floor(index / 3) * 250,
        width: 250,
        height: Math.max(120, table.columns.length * 25 + 60)
      });
    });
    this.tablePositions.set(positions);
  }

  drawDiagram() {
    if (!this.ctx) return;
    
    const canvas = this.canvas.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    this.ctx.fillStyle = '#fafafa';
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    this.drawRelationships();
    
    this.schema().tables.forEach(table => {
      this.drawTable(table);
    });
  }

  drawTable(table: Table) {
    const pos = this.tablePositions().get(table.tableName);
    if (!pos) return;

    const isSelected = this.selectedTable() === table;
    
    this.ctx.fillStyle = isSelected ? '#e3f2fd' : '#ffffff';
    this.ctx.strokeStyle = isSelected ? '#1976d2' : '#cccccc';
    this.ctx.lineWidth = isSelected ? 2 : 1;
    this.ctx.fillRect(pos.x, pos.y, pos.width, pos.height);
    this.ctx.strokeRect(pos.x, pos.y, pos.width, pos.height);

    this.ctx.fillStyle = '#333333';
    this.ctx.font = 'bold 14px Arial';
    this.ctx.fillText(table.tableName, pos.x + 10, pos.y + 20);
    
    this.ctx.strokeStyle = '#cccccc';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x, pos.y + 30);
    this.ctx.lineTo(pos.x + pos.width, pos.y + 30);
    this.ctx.stroke();

    this.ctx.font = '12px Arial';
    table.columns.forEach((column, index) => {
      const y = pos.y + 50 + index * 20;
      const isPrimaryKey = table.primaryKey.includes(column.name);
      
      this.ctx.fillStyle = isPrimaryKey ? '#1976d2' : '#666666';
      const prefix = isPrimaryKey ? '🔑 ' : '';
      const text = `${prefix}${column.name}: ${column.type}`;
      
      this.ctx.fillText(text, pos.x + 10, y);
    });
  }

  drawRelationships() {
    this.schema().tables.forEach(table => {
      table.relationships.forEach(rel => {
        this.drawRelationshipLine(table.tableName, rel);
      });
    });
  }

  drawRelationshipLine(fromTable: string, relationship: Relationship) {
    const fromPos = this.tablePositions().get(fromTable);
    const toPos = this.tablePositions().get(relationship.referencesTable);
    
    if (!fromPos || !toPos) return;

    const fromX = fromPos.x + fromPos.width / 2;
    const fromY = fromPos.y + fromPos.height / 2;
    const toX = toPos.x + toPos.width / 2;
    const toY = toPos.y + toPos.height / 2;

    this.ctx.strokeStyle = '#666666';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(fromX, fromY);
    this.ctx.lineTo(toX, toY);
    this.ctx.stroke();

    const midX = (fromX + toX) / 2;
    const midY = (fromY + toY) / 2;
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(midX - 15, midY - 8, 30, 16);
    this.ctx.strokeRect(midX - 15, midY - 8, 30, 16);
    
    this.ctx.fillStyle = '#333333';
    this.ctx.font = '10px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(this.getRelationshipSymbol(relationship.type), midX, midY + 3);
    this.ctx.textAlign = 'left';
  }

  getRelationshipSymbol(type: string): string {
    switch (type) {
      case 'ONE-TO-ONE': return '1:1';
      case 'ONE-TO-MANY': return '1:N';
      case 'MANY-TO-ONE': return 'N:1';
      case 'MANY-TO-MANY': return 'N:N';
      default: return '?';
    }
  }

  onCanvasMouseDown(event: MouseEvent) {
    const rect = this.canvas.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Clear selection if clicking on empty area
    let tableFound = false;

    for (const [tableName, pos] of this.tablePositions()) {
      if (x >= pos.x && x <= pos.x + pos.width && y >= pos.y && y <= pos.y + pos.height) {
        const table = this.schema().tables.find(t => t.tableName === tableName);
        this.selectedTable.set(table || null);
        
        this.dragState.set({
          isDragging: true,
          table: tableName,
          offsetX: x - pos.x,
          offsetY: y - pos.y
        });
        tableFound = true;
        break;
      }
    }

    // If no table was clicked, clear selection
    if (!tableFound) {
      this.selectedTable.set(null);
    }
    
    // Always redraw to show selection changes
    this.drawDiagram();
  }

  onCanvasMouseMove(event: MouseEvent) {
    const drag = this.dragState();
    if (!drag.isDragging || !drag.table) return;

    const rect = this.canvas.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const positions = new Map(this.tablePositions());
    const pos = positions.get(drag.table);
    if (pos) {
      pos.x = x - drag.offsetX;
      pos.y = y - drag.offsetY;
      positions.set(drag.table, pos);
      this.tablePositions.set(positions);
      this.drawDiagram();
    }
  }

  onCanvasMouseUp() {
    const drag = this.dragState();
    if (drag.isDragging) {
      this.saveState();
    }
    
    this.dragState.set({
      isDragging: false,
      table: null,
      offsetX: 0,
      offsetY: 0
    });
  }

  addTable() {
    this.saveState();
    const tableCount = this.schema().tables.length;
    const newTable: Table = {
      tableName: `new_table_${tableCount + 1}`,
      columns: [{ name: 'id', type: 'INTEGER', constraints: ['PRIMARY KEY', 'AUTO_INCREMENT'] }],
      primaryKey: ['id'],
      relationships: []
    };
    
    this.schema.update(s => ({ ...s, tables: [...s.tables, newTable] }));
    
    const positions = new Map(this.tablePositions());
    positions.set(newTable.tableName, {
      x: 50 + (tableCount % 3) * 300,
      y: 50 + Math.floor(tableCount / 3) * 250,
      width: 250,
      height: 120
    });
    this.tablePositions.set(positions);
    this.drawDiagram();
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'z':
          event.preventDefault();
          this.undo();
          break;
        case 'y':
          event.preventDefault();
          this.redo();
          break;
        case 's':
          event.preventDefault();
          this.saveToLocalStorage();
          alert('Schema saved!');
          break;
      }
    } else if (event.key === 'Delete' && this.selectedTable()) {
      event.preventDefault();
      this.deleteSelectedTable();
    }
  }

  generateSQL() {
    const sql = this.generateCreateTableSQL();
    const dataStr = sql;
    const dataBlob = new Blob([dataStr], { type: 'text/sql' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.schema().schemaName || 'schema'}.sql`;
    link.click();
    URL.revokeObjectURL(url);
    alert('SQL file downloaded!');
  }

  generateCreateTableSQL(): string {
    let sql = `-- Database Schema: ${this.schema().schemaName}\n`;
    sql += `-- Generated on: ${new Date().toISOString()}\n\n`;
    
    this.schema().tables.forEach(table => {
      sql += `CREATE TABLE ${table.tableName} (\n`;
      
      table.columns.forEach((column, index) => {
        sql += `  ${column.name} ${column.type}`;
        
        if (column.constraints) {
          column.constraints.forEach(constraint => {
            if (constraint !== 'PRIMARY KEY') {
              sql += ` ${constraint}`;
            }
          });
        }
        
        if (index < table.columns.length - 1) sql += ',';
        sql += '\n';
      });
      
      if (table.primaryKey.length > 0) {
        sql += `,  PRIMARY KEY (${table.primaryKey.join(', ')})\n`;
      }
      
      sql += ');\n\n';
    });
    
    // Add foreign key constraints
    this.schema().tables.forEach(table => {
      table.relationships.forEach(rel => {
        sql += `ALTER TABLE ${table.tableName} ADD CONSTRAINT fk_${table.tableName}_${rel.foreignKey} `;
        sql += `FOREIGN KEY (${rel.foreignKey}) REFERENCES ${rel.referencesTable}(${rel.referencesColumn})`;
        sql += ` ON DELETE ${rel.onDelete} ON UPDATE ${rel.onUpdate};\n`;
      });
    });
    
    return sql;
  }
  deleteSelectedTable() {
    const selected = this.selectedTable();
    if (!selected) return;
    
    const hasRelationships = selected.relationships.length > 0;
    const referencedByOthers = this.schema().tables.some(table => 
      table.relationships.some(rel => rel.referencesTable === selected.tableName)
    );
    
    let message = `Are you sure you want to delete table '${selected.tableName}'?`;
    if (hasRelationships || referencedByOthers) {
      message += ' This will also delete all related relationships.';
    }
    
    if (confirm(message)) {
      this.saveState();
      
      // Remove relationships from other tables that reference this table
      this.schema().tables.forEach(table => {
        table.relationships = table.relationships.filter(rel => 
          rel.referencesTable !== selected.tableName
        );
      });
      
      this.schema.update(s => ({
        ...s,
        tables: s.tables.filter(t => t.tableName !== selected.tableName)
      }));
      
      const positions = new Map(this.tablePositions());
      positions.delete(selected.tableName);
      this.tablePositions.set(positions);
      
      this.selectedTable.set(null);
      this.drawDiagram();
      alert(`Table '${selected.tableName}' deleted`);
    }
  }

  addColumn() {
    const selected = this.selectedTable();
    if (!selected) return;
    
    this.saveState();
    selected.columns.push({ name: 'new_column', type: 'VARCHAR(50)' });
    this.updateTableHeight(selected.tableName);
    this.schema.update(s => ({ ...s }));
    this.drawDiagram();
  }

  deleteColumn(index: number) {
    this.saveState();
    const selected = this.selectedTable();
    if (!selected || selected.columns.length <= 1) return;
    
    const columnName = selected.columns[index].name;
    selected.columns.splice(index, 1);
    
    const pkIndex = selected.primaryKey.indexOf(columnName);
    if (pkIndex > -1) {
      selected.primaryKey.splice(pkIndex, 1);
    }
    
    this.updateTableHeight(selected.tableName);
    this.schema.update(s => ({ ...s }));
    this.drawDiagram();
  }

  updateTableHeight(tableName: string) {
    const positions = new Map(this.tablePositions());
    const pos = positions.get(tableName);
    const table = this.schema().tables.find(t => t.tableName === tableName);
    
    if (pos && table) {
      pos.height = Math.max(120, table.columns.length * 25 + 60);
      positions.set(tableName, pos);
      this.tablePositions.set(positions);
    }
  }

  togglePrimaryKey(table: Table, columnName: string) {
    this.saveState();
    const index = table.primaryKey.indexOf(columnName);
    if (index > -1) {
      table.primaryKey.splice(index, 1);
    } else {
      table.primaryKey.push(columnName);
    }
    this.schema.update(s => ({ ...s }));
    this.drawDiagram();
  }

  updateTableName(table: Table, event: Event) {
    this.saveState();
    const input = event.target as HTMLInputElement;
    const oldName = table.tableName;
    const newName = input.value;
    
    table.tableName = newName;
    
    const positions = new Map(this.tablePositions());
    const pos = positions.get(oldName);
    if (pos && newName !== oldName) {
      positions.delete(oldName);
      positions.set(newName, pos);
      this.tablePositions.set(positions);
    }
    
    this.schema.update(s => ({ ...s }));
    this.drawDiagram();
  }

  addRelationship() {
    this.saveState();
    const selected = this.selectedTable();
    if (!selected) return;
    
    const otherTable = this.schema().tables.find(t => t.tableName !== selected.tableName);
    if (!otherTable) return;
    
    const newRelationship: Relationship = {
      type: 'MANY-TO-ONE',
      foreignKey: selected.columns[0]?.name || '',
      referencesTable: otherTable.tableName,
      referencesColumn: 'id',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    };
    
    selected.relationships.push(newRelationship);
    this.schema.update(s => ({ ...s }));
    this.drawDiagram();
  }

  deleteRelationship(index: number) {
    this.saveState();
    const selected = this.selectedTable();
    if (!selected) return;
    
    selected.relationships.splice(index, 1);
    this.schema.update(s => ({ ...s }));
    this.drawDiagram();
  }

  onColumnChange() {
    this.saveState();
    this.schema.update(s => ({ ...s }));
    this.drawDiagram();
  }

  onRelationshipChange() {
    this.saveState();
    this.schema.update(s => ({ ...s }));
    this.drawDiagram();
  }

  saveState() {
    this.undoStack.push({
      schema: structuredClone(this.schema()),
      positions: new Map(this.tablePositions())
    });
    this.redoStack = [];
    if (this.undoStack.length > 50) this.undoStack.shift();
    this.canUndoSignal.set(this.undoStack.length > 0);
    this.canRedoSignal.set(this.redoStack.length > 0);
    this.saveToLocalStorage();
  }

  undo() {
    if (this.undoStack.length === 0) return;
    
    this.redoStack.push({
      schema: structuredClone(this.schema()),
      positions: new Map(this.tablePositions())
    });
    
    const state = this.undoStack.pop()!;
    this.schema.set(state.schema);
    this.tablePositions.set(state.positions);
    this.selectedTable.set(null);
    this.canUndoSignal.set(this.undoStack.length > 0);
    this.canRedoSignal.set(this.redoStack.length > 0);
    this.drawDiagram();
  }

  redo() {
    if (this.redoStack.length === 0) return;
    
    this.undoStack.push({
      schema: structuredClone(this.schema()),
      positions: new Map(this.tablePositions())
    });
    
    const state = this.redoStack.pop()!;
    this.schema.set(state.schema);
    this.tablePositions.set(state.positions);
    this.selectedTable.set(null);
    this.canUndoSignal.set(this.undoStack.length > 0);
    this.canRedoSignal.set(this.redoStack.length > 0);
    this.drawDiagram();
  }

  canUndo(): boolean {
    return this.canUndoSignal();
  }

  canRedo(): boolean {
    return this.canRedoSignal();
  }

  exportSchema() {
    const dataStr = JSON.stringify(this.schema(), null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.schema().schemaName || 'schema'}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  clearSchema() {
    if (confirm('Are you sure you want to clear all tables? This action cannot be undone.')) {
      this.saveState();
      this.schema.update(s => ({ ...s, tables: [] }));
      this.tablePositions.set(new Map());
      this.selectedTable.set(null);
      this.drawDiagram();
      alert('Schema cleared');
    }
  }

  saveToLocalStorage() {
    const data = {
      schema: this.schema(),
      positions: Array.from(this.tablePositions().entries())
    };
    localStorage.setItem('schema-editor-data', JSON.stringify(data));
  }

  loadFromLocalStorage() {
    const saved = localStorage.getItem('schema-editor-data');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.schema.set(data.schema);
        this.tablePositions.set(new Map(data.positions));
      } catch (e) {
        console.warn('Failed to load saved schema data');
      }
    }
  }
  ngOnDestroy() {
    window.removeEventListener('resize', this.handleResize.bind(this));
  }
}