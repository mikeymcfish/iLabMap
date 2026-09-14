"""Add map_id to Item model

Revision ID: 3bb35bb39457
Revises: 
Create Date: 2024-10-10 12:45:23.123456

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '3bb35bb39457'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Add map_id column as nullable
    op.add_column('item', sa.Column('map_id', sa.Integer(), nullable=True))
    
    # Create a default map if it doesn't exist
    op.execute("INSERT INTO map (name, svg_path) SELECT 'Default Map', '/static/img/makerspace_map.svg' WHERE NOT EXISTS (SELECT 1 FROM map LIMIT 1)")
    
    # Update existing items to use the default map
    op.execute("UPDATE item SET map_id = (SELECT id FROM map LIMIT 1) WHERE map_id IS NULL")
    
    # Add foreign key constraint
    op.create_foreign_key(None, 'item', 'map', ['map_id'], ['id'])
    
    # Make map_id non-nullable
    op.alter_column('item', 'map_id', nullable=False)


def downgrade():
    op.drop_constraint(None, 'item', type_='foreignkey')
    op.drop_column('item', 'map_id')
