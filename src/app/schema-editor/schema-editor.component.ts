import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabaseSchema, Table, Column, Relationship, DatabaseConstraint, RelationshipType, ReferentialAction } from '../data';
import data from '../data';

@Component({
  selector: 'app-schema-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './schema-editor.component.html',
  styleUrls: ['./schema-editor.component.css']
})
export class SchemaEditorComponent {
  schema = signal<DatabaseSchema>(structuredClone(data));
  selectedTable = signal<Table | null>(null);
  
  readonly dataTypes = ['INTEGER', 'VARCHAR(50)', 'VARCHAR(100)', 'VARCHAR(255)', 'TEXT', 'TIMESTAMP', 'BOOLEAN', 'DECIMAL'];
  readonly constraints: DatabaseConstraint[] = ['NOT NULL', 'UNIQUE', 'PRIMARY KEY', 'AUTO_INCREMENT', 'DEFAULT CURRENT_TIMESTAMP'];
  readonly relationshipTypes: RelationshipType[] = ['ONE-TO-ONE', 'ONE-TO-MANY', 'MANY-TO-ONE', 'MANY-TO-MANY'];
  readonly referentialActions: ReferentialAction[] = ['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION'];

  addTable() {
    const newTable: Table = {
      tableName: 'new_table',
      columns: [{ name: 'id', type: 'INTEGER', constraints: ['PRIMARY KEY', 'AUTO_INCREMENT'] }],
      primaryKey: ['id'],
      relationships: []
    };
    this.schema.update(s => ({ ...s, tables: [...s.tables, newTable] }));
  }

  deleteTable(index: number) {
    this.schema.update(s => ({ ...s, tables: s.tables.filter((_, i) => i !== index) }));
    this.selectedTable.set(null);
  }

  selectTable(table: Table) {
    this.selectedTable.set(table);
  }

  addColumn() {
    const table = this.selectedTable();
    if (!table) return;
    
    table.columns.push({ name: 'new_column', type: 'VARCHAR(50)' });
    this.schema.update(s => ({ ...s }));
  }

  deleteColumn(columnIndex: number) {
    const table = this.selectedTable();
    if (!table) return;
    
    table.columns.splice(columnIndex, 1);
    this.schema.update(s => ({ ...s }));
  }

  addRelationship() {
    const table = this.selectedTable();
    if (!table) return;
    
    const newRelationship: Relationship = {
      type: 'MANY-TO-ONE',
      foreignKey: '',
      referencesTable: '',
      referencesColumn: 'id',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    };
    table.relationships.push(newRelationship);
    this.schema.update(s => ({ ...s }));
  }

  deleteRelationship(relationshipIndex: number) {
    const table = this.selectedTable();
    if (!table) return;
    
    table.relationships.splice(relationshipIndex, 1);
    this.schema.update(s => ({ ...s }));
  }

  toggleConstraint(column: Column, constraint: DatabaseConstraint) {
    if (!column.constraints) column.constraints = [];
    
    const index = column.constraints.indexOf(constraint);
    if (index > -1) {
      column.constraints.splice(index, 1);
    } else {
      column.constraints.push(constraint);
    }
    this.schema.update(s => ({ ...s }));
  }

  hasConstraint(column: Column, constraint: DatabaseConstraint): boolean {
    return column.constraints?.includes(constraint) || false;
  }

  exportSchema(): string {
    return JSON.stringify(this.schema(), null, 2);
  }

  getAvailableTables(): string[] {
    return this.schema().tables.map(t => t.tableName);
  }

  getAvailableColumns(tableName: string): string[] {
    const table = this.schema().tables.find(t => t.tableName === tableName);
    return table?.columns.map(c => c.name) || [];
  }
}