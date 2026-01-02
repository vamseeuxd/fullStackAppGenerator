export type DatabaseConstraint =
  | 'NOT NULL'
  | 'UNIQUE'
  | 'PRIMARY KEY'
  | 'FOREIGN KEY'
  | 'CHECK'
  | 'DEFAULT'
  | 'AUTO_INCREMENT'
  | 'DEFAULT CURRENT_TIMESTAMP'
  | 'CREATE INDEX';

export type RelationshipType = 'ONE-TO-ONE' | 'ONE-TO-MANY' | 'MANY-TO-ONE' | 'MANY-TO-MANY';

export type ReferentialAction = 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' | 'SET DEFAULT';

export interface Column {
  name: string;
  type: string;
  constraints?: DatabaseConstraint[];
  defaultValue?: string | number | boolean;
}

export interface Relationship {
  type: RelationshipType;
  foreignKey: string;
  referencesTable: string;
  referencesColumn: string;
  onDelete: ReferentialAction;
  onUpdate: ReferentialAction;
}

export interface Table {
  tableName: string;
  columns: Column[];
  primaryKey: string[];
  relationships: Relationship[];
  indexes?: string[];
}

export interface DatabaseSchema {
  schemaName: string;
  tables: Table[];
  version?: string;
  createdAt?: string;
}

const data: DatabaseSchema = {
  schemaName: 'BloggingPlatform',
  tables: [
    {
      tableName: 'users',
      columns: [
        {
          name: 'id',
          type: 'INTEGER',
          constraints: ['PRIMARY KEY', 'NOT NULL', 'UNIQUE', 'AUTO_INCREMENT'],
        },
        {
          name: 'username',
          type: 'VARCHAR(50)',
          constraints: ['NOT NULL', 'UNIQUE'],
        },
        {
          name: 'email',
          type: 'VARCHAR(100)',
          constraints: ['NOT NULL', 'UNIQUE'],
        },
        {
          name: 'password_hash',
          type: 'VARCHAR(255)',
          constraints: ['NOT NULL'],
        },
        {
          name: 'created_at',
          type: 'TIMESTAMP',
          constraints: ['DEFAULT CURRENT_TIMESTAMP'],
        },
        {
          name: 'updated_at',
          type: 'TIMESTAMP',
          constraints: ['DEFAULT CURRENT_TIMESTAMP'],
        },
      ],
      primaryKey: ['id'],
      relationships: [],
    },
    {
      tableName: 'posts',
      columns: [
        {
          name: 'id',
          type: 'INTEGER',
          constraints: ['PRIMARY KEY', 'NOT NULL', 'UNIQUE', 'AUTO_INCREMENT'],
        },
        {
          name: 'user_id',
          type: 'INTEGER',
          constraints: ['NOT NULL'],
        },
        {
          name: 'title',
          type: 'VARCHAR(255)',
          constraints: ['NOT NULL'],
        },
        {
          name: 'content',
          type: 'TEXT',
        },
        {
          name: 'created_at',
          type: 'TIMESTAMP',
          constraints: ['DEFAULT CURRENT_TIMESTAMP'],
        },
        {
          name: 'updated_at',
          type: 'TIMESTAMP',
          constraints: ['DEFAULT CURRENT_TIMESTAMP'],
        },
      ],
      primaryKey: ['id'],
      relationships: [
        {
          type: 'MANY-TO-ONE',
          foreignKey: 'user_id',
          referencesTable: 'users',
          referencesColumn: 'id',
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
      ],
    },
    {
      tableName: 'comments',
      columns: [
        {
          name: 'id',
          type: 'INTEGER',
          constraints: ['PRIMARY KEY', 'NOT NULL', 'AUTO_INCREMENT'],
        },
        {
          name: 'post_id',
          type: 'INTEGER',
          constraints: ['NOT NULL'],
        },
        {
          name: 'user_id',
          type: 'INTEGER',
          constraints: ['NOT NULL'],
        },
        {
          name: 'comment_text',
          type: 'TEXT',
          constraints: ['NOT NULL'],
        },
        {
          name: 'created_at',
          type: 'TIMESTAMP',
          constraints: ['DEFAULT CURRENT_TIMESTAMP'],
        },
      ],
      primaryKey: ['id'],
      relationships: [
        {
          type: 'MANY-TO-ONE',
          foreignKey: 'post_id',
          referencesTable: 'posts',
          referencesColumn: 'id',
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        {
          type: 'MANY-TO-ONE',
          foreignKey: 'user_id',
          referencesTable: 'users',
          referencesColumn: 'id',
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
      ],
    },
  ],
  version: '1.0.0',
  createdAt: new Date().toISOString(),
};

export default data;
