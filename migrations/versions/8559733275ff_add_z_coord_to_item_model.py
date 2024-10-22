"""Add z_coord to Item model

Revision ID: 8559733275ff
Revises: e94892c1aa38
Create Date: 2024-10-20 12:34:56.789012

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '8559733275ff'
down_revision = 'e94892c1aa38'
branch_labels = None
depends_on = None


def upgrade():
    # Add z_coord column as nullable
    op.add_column('item', sa.Column('z_coord', sa.Float(), nullable=True))
    
    # Update existing rows with a default value (0.0)
    op.execute("UPDATE item SET z_coord = 0.0 WHERE z_coord IS NULL")
    
    # Alter the column to be non-nullable
    op.alter_column('item', 'z_coord', nullable=False)


def downgrade():
    op.drop_column('item', 'z_coord')
