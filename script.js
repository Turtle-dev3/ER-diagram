// ER Diagram Maker functionality

document.addEventListener('DOMContentLoaded', () => {
    // Application state
    const state = {
        entities: [],
        relationships: [],
        selectedElement: null,
        nextEntityId: 1,
        nextRelationshipId: 1,
        isCreatingRelationship: false,
        relationshipStart: null,
        canvas: document.getElementById('canvas'),
        isDragging: false,
        dragOffsetX: 0,
        dragOffsetY: 0,
        currentEntityType: 'regular' // Default entity type
    };

    // DOM elements
    const addEntityBtn = document.getElementById('add-entity-btn');
    const entityTypeDropdown = document.getElementById('entity-type-dropdown');
    const addRelationshipBtn = document.getElementById('add-relationship-btn');
    const deleteBtn = document.getElementById('delete-btn');
    const exportBtn = document.getElementById('export-btn'); // New export button
    const saveBtn = document.getElementById('save-btn');
    const loadBtn = document.getElementById('load-btn');
    const clearBtn = document.getElementById('clear-btn');
    const entityModal = document.getElementById('entity-modal');
    const entityNameInput = document.getElementById('entity-name');
    const entityTypeSelect = document.getElementById('entity-type');
    const entityTypePropertySelect = document.getElementById('entity-type-select');
    const createEntityBtn = document.getElementById('create-entity-btn');
    const closeModalBtn = document.querySelector('.close');
    const addAttributeBtn = document.getElementById('add-attribute-btn');
    const entityPropertiesPanel = document.getElementById('entity-properties');
    const relationshipPropertiesPanel = document.getElementById('relationship-properties');
    const entityAttrsContainer = document.getElementById('entity-attrs');
    const relationshipTypeSelect = document.getElementById('relationship-type');

    // Hide properties panels initially
    entityPropertiesPanel.style.display = 'none';
    relationshipPropertiesPanel.style.display = 'none';

    // Event listener for entity type dropdown items
    entityTypeDropdown.querySelectorAll('a').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const entityType = e.target.getAttribute('data-type');
            showEntityModal(entityType);
        });
    });

    function showEntityModal(type) {
        // Set the entity type in the dropdown
        entityTypeSelect.value = type;
        entityNameInput.value = '';
        
        // Show the modal with animation
        entityModal.style.display = 'block';
        
        // Force a reflow to ensure animation works
        void entityModal.offsetWidth;
        
        // Add animation class
        entityModal.classList.add('fade-in');
        
        // Focus on the input field
        entityNameInput.focus();
    }

    // Support Enter key for entity creation
    entityNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            createEntityBtn.click();
        }
    });

    closeModalBtn.addEventListener('click', () => {
        // Add fade out animation
        entityModal.classList.add('fade-out');
        
        // Wait for animation to complete before hiding
        setTimeout(() => {
            entityModal.style.display = 'none';
            entityModal.classList.remove('fade-in', 'fade-out');
        }, 300);
    });

    // Close modal if clicking outside of it
    window.addEventListener('click', (event) => {
        if (event.target === entityModal) {
            // Add fade out animation
            entityModal.classList.add('fade-out');
            
            // Wait for animation to complete before hiding
            setTimeout(() => {
                entityModal.style.display = 'none';
                entityModal.classList.remove('fade-in', 'fade-out');
            }, 300);
        }
    });

    createEntityBtn.addEventListener('click', () => {
        const name = entityNameInput.value.trim();
        if (name) {
            // Generate a random position in the visible canvas area
            const canvasRect = state.canvas.getBoundingClientRect();
            const x = Math.random() * (canvasRect.width - 200) + 50;
            const y = Math.random() * (canvasRect.height - 200) + 50;
            
            // Create the entity
            createEntity(name, x, y, entityTypeSelect.value);
            
            // Close the modal with animation
            entityModal.classList.add('fade-out');
            
            // Wait for animation to complete before hiding
            setTimeout(() => {
                entityModal.style.display = 'none';
                entityModal.classList.remove('fade-in', 'fade-out');
                entityNameInput.value = '';
            }, 300);
        }
    });

    // Entity type change in properties panel
    entityTypePropertySelect.addEventListener('change', () => {
        if (state.selectedElement && state.selectedElement.classList.contains('entity')) {
            const entityId = state.selectedElement.id;
            const entity = state.entities.find(e => e.id === entityId);
            if (entity) {
                const newType = entityTypePropertySelect.value;
                entity.type = newType;
                
                // Update entity display
                updateEntityType(state.selectedElement, newType);
            }
        }
    });

    addRelationshipBtn.addEventListener('click', () => {
        toggleRelationshipCreationMode();
    });

    deleteBtn.addEventListener('click', () => {
        if (state.selectedElement) {
            if (state.selectedElement.classList.contains('entity')) {
                deleteEntity(state.selectedElement.id);
            } else if (state.selectedElement.classList.contains('relationship-label')) {
                deleteRelationship(state.selectedElement.getAttribute('data-relationship-id'));
            }
            state.selectedElement = null;
            updatePropertiesPanel();
        }
    });

    saveBtn.addEventListener('click', saveERDiagram);
    loadBtn.addEventListener('click', loadERDiagram);
    clearBtn.addEventListener('click', clearERDiagram);
    exportBtn.addEventListener('click', exportAsImage); // Add event listener for export
    
    addAttributeBtn.addEventListener('click', () => {
        if (state.selectedElement && state.selectedElement.classList.contains('entity')) {
            const entityId = state.selectedElement.id;
            showAttributeForm(entityId);
        }
    });

    relationshipTypeSelect.addEventListener('change', () => {
        if (state.selectedElement && state.selectedElement.classList.contains('relationship-label')) {
            const relationshipId = state.selectedElement.getAttribute('data-relationship-id');
            const relationship = state.relationships.find(r => r.id === relationshipId);
            if (relationship) {
                relationship.type = relationshipTypeSelect.value;
                drawRelationships();
            }
        }
    });

    // Functions to handle entity creation and management
    function createEntity(name, x, y, type = 'regular') {
        const entityId = `entity-${state.nextEntityId++}`;
        const entity = {
            id: entityId,
            name: name,
            attributes: [],
            x: x,
            y: y,
            type: type
        };

        state.entities.push(entity);
        renderEntity(entity);
        
        // Animate entity appearance
        const entityEl = document.getElementById(entityId);
        entityEl.style.opacity = '0';
        entityEl.style.transform = type === 'relationship' ? 'rotate(45deg) scale(0.8)' : 'scale(0.8)';
        
        setTimeout(() => {
            entityEl.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            entityEl.style.opacity = '1';
            entityEl.style.transform = type === 'relationship' ? 'rotate(45deg) scale(1)' : 'scale(1)';
        }, 10);
        
        return entity;
    }

    function updateEntityType(entityEl, newType) {
        // Get entity details before changing
        const entityId = entityEl.id;
        const entity = state.entities.find(e => e.id === entityId);
        
        // Remove all entity type classes
        entityEl.classList.remove('weak-entity', 'relationship-entity');
        
        // Reset any transforms that might be applied
        entityEl.style.transform = '';
        
        // Add the appropriate class and set transform
        if (newType === 'weak') {
            entityEl.classList.add('weak-entity');
        } else if (newType === 'relationship') {
            entityEl.classList.add('relationship-entity');
            entityEl.style.transform = 'rotate(45deg)';
        }
        
        // Re-render the entity content to ensure proper layout
        refreshEntityView(entity);
        
        // Redraw relationships to ensure proper connections
        drawRelationships();
    }

    function renderEntity(entity) {
        const entityEl = document.createElement('div');
        entityEl.id = entity.id;
        entityEl.className = 'entity';
        
        // Add specific class based on entity type
        if (entity.type === 'weak') {
            entityEl.classList.add('weak-entity');
        } else if (entity.type === 'relationship') {
            entityEl.classList.add('relationship-entity');
        }
        
        entityEl.style.left = `${entity.x}px`;
        entityEl.style.top = `${entity.y}px`;

        const header = document.createElement('div');
        header.className = 'entity-header';
        header.textContent = entity.name;
        entityEl.appendChild(header);

        const attributesContainer = document.createElement('div');
        attributesContainer.className = 'entity-attributes';
        
        entity.attributes.forEach(attr => {
            const attrElement = document.createElement('div');
            attrElement.className = 'entity-attribute';
            attrElement.textContent = attr.name + (attr.isPrimaryKey ? ' (PK)' : '');
            attributesContainer.appendChild(attrElement);
        });

        entityEl.appendChild(attributesContainer);
        state.canvas.appendChild(entityEl);

        // Add event listeners for dragging
        entityEl.addEventListener('mousedown', handleElementMouseDown);
        entityEl.addEventListener('click', (e) => {
            e.stopPropagation();
            selectElement(entityEl);
            
            if (state.isCreatingRelationship) {
                handleEntityClick(entity);
            }
        });
    }

    function showAttributeForm(entityId) {
        const entity = state.entities.find(e => e.id === entityId);
        if (!entity) return;
        
        // Create an inline form for adding attributes
        const formContainer = document.createElement('div');
        formContainer.className = 'attribute-form-container';
        formContainer.innerHTML = `
            <input type="text" id="new-attr-name" placeholder="Attribute name" class="attr-input">
            <div class="attr-buttons">
                <button id="add-as-regular" class="attr-btn">Add</button>
                <button id="add-as-pk" class="attr-btn pk-btn">Add as PK</button>
            </div>
        `;
        
        entityAttrsContainer.appendChild(formContainer);
        
        const nameInput = document.getElementById('new-attr-name');
        nameInput.focus();
        
        document.getElementById('add-as-regular').addEventListener('click', () => {
            addNewAttribute(entity, nameInput.value.trim(), false);
            formContainer.remove();
        });
        
        document.getElementById('add-as-pk').addEventListener('click', () => {
            addNewAttribute(entity, nameInput.value.trim(), true);
            formContainer.remove();
        });
        
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                addNewAttribute(entity, nameInput.value.trim(), false);
                formContainer.remove();
            } else if (e.key === 'Escape') {
                formContainer.remove();
            }
        });
    }

    function addNewAttribute(entity, name, isPrimaryKey) {
        if (!name) return;
        
        entity.attributes.push({
            name: name,
            isPrimaryKey: isPrimaryKey
        });
        
        refreshEntityView(entity);
        updatePropertiesPanel();
    }

    function addAttribute(entityId) {
        showAttributeForm(entityId);
    }

    function refreshEntityView(entity) {
        const entityEl = document.getElementById(entity.id);
        if (!entityEl) return;
        
        // Remove all children
        while (entityEl.firstChild) {
            entityEl.removeChild(entityEl.firstChild);
        }
        
        // Re-add header
        const header = document.createElement('div');
        header.className = 'entity-header';
        header.textContent = entity.name;
        entityEl.appendChild(header);
        
        // Re-add attributes
        const attributesContainer = document.createElement('div');
        attributesContainer.className = 'entity-attributes';
        
        entity.attributes.forEach(attr => {
            const attrElement = document.createElement('div');
            attrElement.className = 'entity-attribute';
            attrElement.textContent = attr.name + (attr.isPrimaryKey ? ' (PK)' : '');
            attributesContainer.appendChild(attrElement);
        });
        
        entityEl.appendChild(attributesContainer);
    }

    function deleteEntity(entityId) {
        // Animate entity removal
        const entityEl = document.getElementById(entityId);
        if (entityEl) {
            entityEl.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            entityEl.style.opacity = '0';
            entityEl.style.transform = 'scale(0.8)';
            
            setTimeout(() => {
                // Remove related relationships
                state.relationships = state.relationships.filter(rel => {
                    if (rel.source === entityId || rel.target === entityId) {
                        const relationshipEl = document.querySelector(`[data-relationship-id="${rel.id}"]`);
                        if (relationshipEl) {
                            relationshipEl.remove();
                        }
                        return false;
                    }
                    return true;
                });
                
                // Remove entity
                state.entities = state.entities.filter(e => e.id !== entityId);
                entityEl.remove();
                
                drawRelationships();
            }, 300);
        }
    }

    // Functions to handle relationship creation and management
    function toggleRelationshipCreationMode() {
        state.isCreatingRelationship = !state.isCreatingRelationship;
        state.relationshipStart = null;
        
        if (state.isCreatingRelationship) {
            addRelationshipBtn.textContent = 'Cancel Relationship';
            addRelationshipBtn.style.backgroundColor = '#f44336';
            state.canvas.style.cursor = 'crosshair';
            
            // Add visual indicator for relationship creation mode
            state.canvas.classList.add('relationship-mode');
            
            // Add instructional tooltip
            const tooltip = document.createElement('div');
            tooltip.id = 'relationship-tooltip';
            tooltip.className = 'tooltip';
            tooltip.textContent = 'Click on two entities to create a relationship';
            document.body.appendChild(tooltip);
        } else {
            addRelationshipBtn.textContent = 'Add Relationship';
            addRelationshipBtn.style.backgroundColor = '#4CAF50';
            state.canvas.style.cursor = 'default';
            
            // Remove visual indicators
            state.canvas.classList.remove('relationship-mode');
            const tooltip = document.getElementById('relationship-tooltip');
            if (tooltip) tooltip.remove();
            
            // Remove any highlights
            document.querySelectorAll('.entity.highlighted').forEach(el => {
                el.classList.remove('highlighted');
            });
        }
    }

    function handleEntityClick(entity) {
        if (!state.relationshipStart) {
            state.relationshipStart = entity.id;
            // Highlight the selected entity
            const el = document.getElementById(entity.id);
            el.classList.add('highlighted');
        } else if (state.relationshipStart !== entity.id) {
            // Create relationship between two different entities
            createRelationship(state.relationshipStart, entity.id);
            
            // Remove highlight
            const startEl = document.getElementById(state.relationshipStart);
            if (startEl) startEl.classList.remove('highlighted');
            
            // Reset relationship creation state
            state.relationshipStart = null;
            toggleRelationshipCreationMode();
        }
    }

    function createRelationship(sourceId, targetId) {
        const relationshipId = `relationship-${state.nextRelationshipId++}`;
        const relationship = {
            id: relationshipId,
            source: sourceId,
            target: targetId,
            type: 'one-to-many' // Default type
        };
        
        state.relationships.push(relationship);
        drawRelationships();
    }

    function drawRelationships() {
        // Clear all existing relationship lines
        const existingLines = state.canvas.querySelectorAll('.relationship, .relationship-label');
        existingLines.forEach(el => el.remove());
        
        // Redraw all relationships
        state.relationships.forEach(rel => {
            const sourceEl = document.getElementById(rel.source);
            const targetEl = document.getElementById(rel.target);
            
            if (sourceEl && targetEl) {
                // Get positions
                const sourceRect = sourceEl.getBoundingClientRect();
                const targetRect = targetEl.getBoundingClientRect();
                const canvasRect = state.canvas.getBoundingClientRect();
                
                // Check if source or target is a relationship entity
                const sourceIsRelationship = sourceEl.classList.contains('relationship-entity');
                const targetIsRelationship = targetEl.classList.contains('relationship-entity');
                
                // Calculate connection points based on entity type
                let sourcePoint, targetPoint;
                
                if (sourceIsRelationship) {
                    sourcePoint = calculateDiamondConnectionPoint(sourceEl, targetEl, canvasRect);
                } else {
                    sourcePoint = calculateRectangleConnectionPoint(sourceEl, targetEl, canvasRect);
                }
                
                if (targetIsRelationship) {
                    targetPoint = calculateDiamondConnectionPoint(targetEl, sourceEl, canvasRect);
                } else {
                    targetPoint = calculateRectangleConnectionPoint(targetEl, sourceEl, canvasRect);
                }
                
                // Draw line using calculated connection points
                drawRelationshipLine(sourcePoint, targetPoint, rel);
            }
        });
    }

    // Calculate connection point for rectangular entities
    function calculateRectangleConnectionPoint(rectEl, otherEl, canvasRect) {
        const rectRect = rectEl.getBoundingClientRect();
        const otherRect = otherEl.getBoundingClientRect();
        
        // Calculate centers
        const rectCenter = {
            x: rectRect.left - canvasRect.left + rectRect.width / 2,
            y: rectRect.top - canvasRect.top + rectRect.height / 2
        };
        
        const otherCenter = {
            x: otherRect.left - canvasRect.left + otherRect.width / 2,
            y: otherRect.top - canvasRect.top + otherRect.height / 2
        };
        
        // Calculate angle between centers
        const dx = otherCenter.x - rectCenter.x;
        const dy = otherCenter.y - rectCenter.y;
        const angle = Math.atan2(dy, dx);
        
        // Find intersection with rectangle
        let x, y;
        const halfWidth = rectRect.width / 2;
        const halfHeight = rectRect.height / 2;
        
        if (Math.abs(Math.cos(angle)) * halfHeight > Math.abs(Math.sin(angle)) * halfWidth) {
            // Intersect with left or right side
            const xSign = Math.sign(Math.cos(angle));
            x = rectCenter.x + xSign * halfWidth;
            y = rectCenter.y + Math.tan(angle) * xSign * halfWidth;
        } else {
            // Intersect with top or bottom side
            const ySign = Math.sign(Math.sin(angle));
            y = rectCenter.y + ySign * halfHeight;
            x = rectCenter.x + (1 / Math.tan(angle)) * ySign * halfHeight;
        }
        
        return { x, y };
    }

    // Calculate connection point for diamond-shaped entities
    function calculateDiamondConnectionPoint(diamondEl, otherEl, canvasRect) {
        const diamondRect = diamondEl.getBoundingClientRect();
        const otherRect = otherEl.getBoundingClientRect();
        
        // Calculate centers
        const diamondCenter = {
            x: diamondRect.left - canvasRect.left + diamondRect.width / 2,
            y: diamondRect.top - canvasRect.top + diamondRect.height / 2
        };
        
        const otherCenter = {
            x: otherRect.left - canvasRect.left + otherRect.width / 2,
            y: otherRect.top - canvasRect.top + otherRect.height / 2
        };
        
        // Calculate angle between centers
        const dx = otherCenter.x - diamondCenter.x;
        const dy = otherCenter.y - diamondCenter.y;
        const angle = Math.atan2(dy, dx);
        
        // Distance from center to corner is the same in all directions for a diamond
        // Half of diamondRect.width / sqrt(2) gives us the distance to a corner
        const distance = diamondRect.width / 2 / Math.sqrt(2);
        
        // Diamond corners are at 45, 135, 225, and 315 degrees from center
        // Find which quadrant the angle falls into to determine which corner to use
        let cornerAngle;
        if (angle >= -Math.PI/4 && angle < Math.PI/4) {
            // Right corner (0 degrees)
            cornerAngle = 0;
        } else if (angle >= Math.PI/4 && angle < 3*Math.PI/4) {
            // Bottom corner (90 degrees)
            cornerAngle = Math.PI/2;
        } else if (angle >= 3*Math.PI/4 || angle < -3*Math.PI/4) {
            // Left corner (180 degrees)
            cornerAngle = Math.PI;
        } else {
            // Top corner (270 degrees)
            cornerAngle = -Math.PI/2;
        }
        
        // Calculate connection point
        const x = diamondCenter.x + distance * Math.cos(cornerAngle);
        const y = diamondCenter.y + distance * Math.sin(cornerAngle);
        
        return { x, y };
    }

    function drawRelationshipLine(source, target, relationship) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        line.setAttribute('class', 'relationship');
        line.style.position = 'absolute';
        line.style.left = '0';
        line.style.top = '0';
        line.style.width = '100%';
        line.style.height = '100%';
        line.style.pointerEvents = 'none';
        
        // Get line color based on relationship type
        let lineColor;
        switch(relationship.type) {
            case 'one-to-one':
                lineColor = 'var(--neon-blue)';
                break;
            case 'one-to-many':
                lineColor = 'var(--neon-green)';
                break;
            case 'many-to-many':
                lineColor = 'var(--neon-pink)';
                break;
            default:
                lineColor = 'var(--neon-blue)';
        }
        
        // Create glowing laser effect with multiple layered paths
        // Outer glow
        const outerGlow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        outerGlow.setAttribute('d', `M${source.x},${source.y} L${target.x},${target.y}`);
        outerGlow.setAttribute('stroke', lineColor);
        outerGlow.setAttribute('stroke-width', '6');
        outerGlow.setAttribute('stroke-opacity', '0.2');
        outerGlow.setAttribute('fill', 'none');
        
        // Middle glow
        const middleGlow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        middleGlow.setAttribute('d', `M${source.x},${source.y} L${target.x},${target.y}`);
        middleGlow.setAttribute('stroke', lineColor);
        middleGlow.setAttribute('stroke-width', '3');
        middleGlow.setAttribute('stroke-opacity', '0.5');
        middleGlow.setAttribute('fill', 'none');
        
        // Core line
        const coreLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        coreLine.setAttribute('d', `M${source.x},${source.y} L${target.x},${target.y}`);
        coreLine.setAttribute('stroke', '#ffffff');
        coreLine.setAttribute('stroke-width', '1');
        coreLine.setAttribute('stroke-opacity', '0.8');
        coreLine.setAttribute('fill', 'none');
        
        // Add all paths to SVG in layering order
        line.appendChild(outerGlow);
        line.appendChild(middleGlow);
        line.appendChild(coreLine);
        
        state.canvas.appendChild(line);
        
        // Animate the paths for a drawing effect
        const paths = [outerGlow, middleGlow, coreLine];
        paths.forEach(path => {
            const length = path.getTotalLength();
            path.style.strokeDasharray = length;
            path.style.strokeDashoffset = length;
            path.style.transition = 'stroke-dashoffset 0.6s ease-in-out';
            
            // Trigger animation
            setTimeout(() => {
                path.style.strokeDashoffset = 0;
            }, 10);
        });
        
        // Add line decorations based on relationship type
        addRelationshipDecorations(source, target, relationship, lineColor);
    }

    function addRelationshipDecorations(source, target, relationship, lineColor) {
        // Add relationship label at midpoint
        const midX = (source.x + target.x) / 2;
        const midY = (source.y + target.y) / 2;
        
        const label = document.createElement('div');
        label.className = 'relationship-label';
        label.setAttribute('data-relationship-id', relationship.id);
        label.style.left = `${midX - 30}px`;
        label.style.top = `${midY - 15}px`;
        
        switch(relationship.type) {
            case 'one-to-one':
                label.textContent = '1:1';
                break;
            case 'one-to-many':
                label.textContent = '1:N';
                break;
            case 'many-to-many':
                label.textContent = 'N:M';
                break;
        }
        
        // Add animation to the label with the updated styling
        label.style.opacity = '0';
        label.style.transform = 'scale(0.8)';
        
        setTimeout(() => {
            label.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            label.style.opacity = '1';
            label.style.transform = 'scale(1)';
        }, 300); // Start after line animation
        
        label.addEventListener('click', (e) => {
            e.stopPropagation();
            selectElement(label);
        });
        
        state.canvas.appendChild(label);
    }

    function deleteRelationship(relationshipId) {
        // Animate removal
        const labelEl = document.querySelector(`[data-relationship-id="${relationshipId}"]`);
        if (labelEl) {
            labelEl.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            labelEl.style.opacity = '0';
            labelEl.style.transform = 'scale(0.8)';
            
            setTimeout(() => {
                state.relationships = state.relationships.filter(rel => rel.id !== relationshipId);
                drawRelationships();
            }, 300);
        } else {
            state.relationships = state.relationships.filter(rel => rel.id !== relationshipId);
            drawRelationships();
        }
    }

    // Drag and drop functionality
    function handleElementMouseDown(e) {
        if (state.isCreatingRelationship) return;
        
        const element = e.target.closest('.entity');
        if (!element) return;
        
        selectElement(element);
        
        // Store original position and transform for smoother handling
        state.originalPosition = {
            x: parseFloat(element.style.left) || 0,
            y: parseFloat(element.style.top) || 0
        };
        state.originalTransform = element.style.transform;
        
        state.isDragging = true;
        state.draggedElement = element;
        state.dragOffsetX = e.clientX - element.getBoundingClientRect().left;
        state.dragOffsetY = e.clientY - element.getBoundingClientRect().top;
        
        // Remove transitions immediately for responsive dragging
        element.style.transition = 'none';
        
        // Visual feedback for drag start
        element.classList.add('dragging');
        
        // Temporarily add event listeners for dragging
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        
        // Prevent text selection during drag
        e.preventDefault();
    }

    function handleMouseUp() {
        if (!state.isDragging || !state.draggedElement) return;
        
        // Restore entity appearance with smooth animation
        state.draggedElement.classList.remove('dragging');
        
        // Apply proper transition for settling animation
        state.draggedElement.style.transition = 'box-shadow 0.3s ease, transform 0.2s ease';
        
        // Update entity data with final position
        const entityId = state.draggedElement.id;
        const entity = state.entities.find(e => e.id === entityId);
        
        if (entity) {
            // Store current position in entity data model
            entity.x = parseFloat(state.draggedElement.style.left);
            entity.y = parseFloat(state.draggedElement.style.top);
            
            // Restore transform based on entity type with smooth animation
            if (entity.type === 'relationship') {
                state.draggedElement.style.transform = 'rotate(45deg)';
            } else {
                state.draggedElement.style.transform = '';
            }
        }
        
        // Reset dragging state
        state.isDragging = false;
        state.draggedElement = null;
        
        // Redraw all relationships with the final positions
        drawRelationships();
        
        // Remove temporary event listeners
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    }

    function handleMouseMove(e) {
        if (!state.isDragging || !state.draggedElement) return;
        
        // Use requestAnimationFrame for smoother dragging
        requestAnimationFrame(() => {
            const canvasRect = state.canvas.getBoundingClientRect();
            
            // Calculate new position
            let x = e.clientX - canvasRect.left - state.dragOffsetX;
            let y = e.clientY - canvasRect.top - state.dragOffsetY;
            
            // Ensure the entity stays within the canvas with a small margin
            const margin = 5;
            x = Math.max(margin, Math.min(x, canvasRect.width - state.draggedElement.offsetWidth - margin));
            y = Math.max(margin, Math.min(y, canvasRect.height - state.draggedElement.offsetHeight - margin));
            
            // Update position with direct manipulation for smoothness
            state.draggedElement.style.left = `${x}px`;
            state.draggedElement.style.top = `${y}px`;
            
            // Maintain proper rotation during drag for relationship entities
            const entityId = state.draggedElement.id;
            const entity = state.entities.find(e => e.id === entityId);
            if (entity && entity.type === 'relationship') {
                state.draggedElement.style.transform = 'rotate(45deg)';
            }
            
            // Update relationships in real-time with slight throttling for performance
            if (!state.lastRelationshipUpdate || Date.now() - state.lastRelationshipUpdate > 30) {
                drawRelationships();
                state.lastRelationshipUpdate = Date.now();
            }
        });
    }

    // Selection handling
    function selectElement(element) {
        // Deselect previously selected element with animation
        if (state.selectedElement) {
            state.selectedElement.classList.remove('selected');
        }
        
        // Select new element with animation
        state.selectedElement = element;
        element.classList.add('selected');
        
        // Add a small pulse animation
        element.style.animation = 'pulse 0.3s ease';
        setTimeout(() => {
            element.style.animation = '';
        }, 300);
        
        // Update properties panel with animation
        updatePropertiesPanel();
    }

    // Update properties panel based on selection
    function updatePropertiesPanel() {
        entityPropertiesPanel.style.display = 'none';
        relationshipPropertiesPanel.style.display = 'none';
        entityAttrsContainer.innerHTML = '';
        
        if (!state.selectedElement) return;
        
        if (state.selectedElement.classList.contains('entity')) {
            // Show entity properties with smooth transition
            entityPropertiesPanel.style.opacity = '0';
            entityPropertiesPanel.style.display = 'block';
            
            setTimeout(() => {
                entityPropertiesPanel.style.transition = 'opacity 0.3s ease';
                entityPropertiesPanel.style.opacity = '1';
            }, 10);
            
            const entityId = state.selectedElement.id;
            const entity = state.entities.find(e => e.id === entityId);
            
            if (entity) {
                // Set the entity type in the dropdown
                entityTypePropertySelect.value = entity.type || 'regular';
                
                // Display attributes with smaller, more elegant PK and delete buttons
                entity.attributes.forEach((attr, index) => {
                    const attrRow = document.createElement('div');
                    attrRow.className = 'attribute-row';
                    attrRow.innerHTML = `
                        <span>${attr.name}</span>
                        <div class="attribute-actions">
                            <button class="btn-pk-small ${attr.isPrimaryKey ? 'active' : ''}" data-index="${index}" title="Primary Key">PK</button>
                            <button class="delete-attr-btn-small" data-index="${index}" title="Delete">&times;</button>
                        </div>
                    `;
                    entityAttrsContainer.appendChild(attrRow);
                });
                
                // Event listeners for attribute actions
                document.querySelectorAll('.btn-pk-small').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const index = parseInt(e.target.getAttribute('data-index'));
                        entity.attributes[index].isPrimaryKey = !entity.attributes[index].isPrimaryKey;
                        e.target.classList.toggle('active');
                        refreshEntityView(entity);
                    });
                });
                
                document.querySelectorAll('.delete-attr-btn-small').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const index = parseInt(e.target.getAttribute('data-index'));
                        entity.attributes.splice(index, 1);
                        refreshEntityView(entity);
                        updatePropertiesPanel();
                    });
                });
            }
        } else if (state.selectedElement.classList.contains('relationship-label')) {
            // Show relationship properties with smooth transition
            relationshipPropertiesPanel.style.opacity = '0';
            relationshipPropertiesPanel.style.display = 'block';
            
            setTimeout(() => {
                relationshipPropertiesPanel.style.transition = 'opacity 0.3s ease';
                relationshipPropertiesPanel.style.opacity = '1';
            }, 10);
            
            const relationshipId = state.selectedElement.getAttribute('data-relationship-id');
            const relationship = state.relationships.find(r => r.id === relationshipId);
            
            if (relationship) {
                relationshipTypeSelect.value = relationship.type;
            }
        }
    }

    // Save and load functionality
    function saveERDiagram() {
        const diagramData = {
            entities: state.entities,
            relationships: state.relationships,
            nextEntityId: state.nextEntityId,
            nextRelationshipId: state.nextRelationshipId
        };
        
        const jsonData = JSON.stringify(diagramData);
        localStorage.setItem('erDiagram', jsonData);
        alert('Diagram saved successfully!');
    }

    function loadERDiagram() {
        const jsonData = localStorage.getItem('erDiagram');
        if (!jsonData) {
            alert('No saved diagram found!');
            return;
        }
        
        try {
            const diagramData = JSON.parse(jsonData);
            clearERDiagram();
            
            // Restore state
            state.nextEntityId = diagramData.nextEntityId || 1;
            state.nextRelationshipId = diagramData.nextRelationshipId || 1;
            
            // Restore entities
            diagramData.entities.forEach(entity => {
                state.entities.push(entity);
                renderEntity(entity);
            });
            
            // Restore relationships
            state.relationships = diagramData.relationships;
            drawRelationships();
            
            alert('Diagram loaded successfully!');
        } catch (e) {
            alert('Error loading diagram: ' + e.message);
        }
    }

    function clearERDiagram() {
        // Clear all entities and relationships
        state.canvas.innerHTML = '';
        state.entities = [];
        state.relationships = [];
        state.selectedElement = null;
        entityPropertiesPanel.style.display = 'none';
        relationshipPropertiesPanel.style.display = 'none';
        
        // Reset counters
        state.nextEntityId = 1;
        state.nextRelationshipId = 1;
    }

    // Export diagram as image function
    function exportAsImage() {
        // Prepare canvas for export
        // Temporarily remove selection highlight from any selected element
        let selectedElementBackup = null;
        if (state.selectedElement) {
            selectedElementBackup = state.selectedElement;
            state.selectedElement.classList.remove('selected');
        }

        // Remove any tooltips or temporary UI elements
        const tooltip = document.getElementById('relationship-tooltip');
        if (tooltip) tooltip.remove();

        // Show loading indicator
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'loading-indicator';
        loadingIndicator.textContent = 'Creating image...';
        document.body.appendChild(loadingIndicator);

        // Use setTimeout to allow the UI to update before capturing
        setTimeout(() => {
            // Use html2canvas to create an image of the canvas
            html2canvas(state.canvas, {
                backgroundColor: '#fafafa',
                scale: 2, // Higher resolution
                logging: false,
                useCORS: true
            }).then(canvas => {
                // Create a download link for the image
                const link = document.createElement('a');
                link.download = 'er-diagram.png';
                link.href = canvas.toDataURL('image/png');
                
                // Trigger download
                link.click();
                
                // Restore selected element if there was one
                if (selectedElementBackup) {
                    selectedElementBackup.classList.add('selected');
                    state.selectedElement = selectedElementBackup;
                }
                
                // Remove loading indicator
                loadingIndicator.remove();
            }).catch(err => {
                console.error('Error exporting image:', err);
                alert('There was an error creating the image. Please try again.');
                loadingIndicator.remove();
                
                // Restore selected element if there was one
                if (selectedElementBackup) {
                    selectedElementBackup.classList.add('selected');
                    state.selectedElement = selectedElementBackup;
                }
            });
        }, 100);
    }

    // Add key bindings for common operations
    document.addEventListener('keydown', (e) => {
        // Delete or Backspace key to remove selected elements
        if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedElement) {
            // Prevent browser back navigation when pressing Backspace
            if (e.key === 'Backspace') {
                e.preventDefault();
            }
            deleteBtn.click();
        }
        
        // Escape key to cancel relationship creation
        if (e.key === 'Escape' && state.isCreatingRelationship) {
            toggleRelationshipCreationMode();
        }
    });

    // Add this CSS directly to the document for animations
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        
        /* Fade animations for modal */
        .fade-in {
            animation: fadeIn 0.3s forwards;
        }
        
        .fade-out {
            animation: fadeOut 0.3s forwards;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
        
        .highlighted {
            box-shadow: 0 0 0 3px #ff9800;
        }
        
        /* Ensure consistent rotation for relationship entities */
        .entity.relationship-entity {
            transform: rotate(45deg) !important;
        }
        
        /* Ensure no rotation for regular and weak entities */
        .entity:not(.relationship-entity) {
            transform: none !important;
        }
        
        /* Only apply rotation transforms to the content inside relationship entities */
        .relationship-entity .entity-header,
        .relationship-entity .entity-attributes {
            transform: rotate(-45deg);
        }
        
        .relationship-mode {
            outline: 2px dashed #ff9800;
        }
        
        .tooltip {
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            z-index: 100;
            font-size: 14px;
        }
        
        .attribute-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 4px 0;
            border-bottom: 1px solid rgba(0,0,0,0.05);
        }
        
        .attribute-actions {
            display: flex;
            gap: 3px;
        }
        
        .btn-pk-small {
            background-color: #3498db;
            color: white;
            border: none;
            border-radius: 2px;
            font-size: 10px;
            padding: 2px 4px;
            cursor: pointer;
            line-height: 1;
            opacity: 0.7;
            transition: opacity 0.2s;
        }
        
        .btn-pk-small:hover {
            opacity: 1;
        }
        
        .btn-pk-small.active {
            background-color: #e67e22;
            opacity: 1;
        }
        
        .delete-attr-btn-small {
            background-color: #e74c3c;
            color: white;
            border: none;
            border-radius: 2px;
            font-size: 12px;
            width: 16px;
            height: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            cursor: pointer;
            line-height: 1;
            opacity: 0.7;
            transition: opacity 0.2s;
        }
        
        .delete-attr-btn-small:hover {
            opacity: 1;
        }
        
        .attribute-form-container {
            margin: 10px 0;
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        
        .attr-input {
            padding: 5px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        
        .attr-buttons {
            display: flex;
            gap: 5px;
        }
        
        .attr-btn {
            flex: 1;
            padding: 5px;
        }
        
        .pk-btn {
            background-color: #3498db;
        }
        
        .loading-indicator {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            z-index: 2000;
            font-size: 16px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
            animation: pulse 1s infinite;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateX(-10px); }
            to { opacity: 1; transform: translateX(0); }
        }
        
        /* Add animations for dropdown items */
        @keyframes slideIn {
            0% { opacity: 0; transform: translateX(-10px); }
            100% { opacity: 1; transform: translateX(0); }
        }
        
        .dropdown-content a {
            animation: slideIn 0.3s forwards;
            animation-delay: calc(var(--index) * 0.05s);
            opacity: 0;
        }
        
        .dropdown-content a:nth-child(1) { --index: 1; }
        .dropdown-content a:nth-child(2) { --index: 2; }
        .dropdown-content a:nth-child(3) { --index: 3; }

        /* ...existing code... */

        @keyframes pulse {
            0% { transform: scale(1); box-shadow: 0 0 5px rgba(0, 255, 255, 0.3); }
            50% { transform: scale(1.03); box-shadow: 0 0 15px rgba(0, 255, 255, 0.5); }
            100% { transform: scale(1); box-shadow: 0 0 5px rgba(0, 255, 255, 0.3); }
        }
        
        @keyframes glow {
            0% { box-shadow: 0 0 5px var(--neon-blue); }
            50% { box-shadow: 0 0 15px var(--neon-blue); }
            100% { box-shadow: 0 0 5px var(--neon-blue); }
        }
        
        .entity.dragging {
            opacity: 0.9;
            z-index: 100;
            cursor: grabbing;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        }
        
        /* Laser blink animation */
        @keyframes laserBlink {
            0% { opacity: 0.8; }
            50% { opacity: 1; }
            100% { opacity: 0.8; }
        }
        
        .relationship path {
            animation: laserBlink 2s infinite;
        }
        
        /* ...existing animations... */
    `;
    document.head.appendChild(styleElement);
    
    // Initialize canvas click handler
    state.canvas.addEventListener('click', (e) => {
        if (e.target === state.canvas) {
            // Deselect when clicking on canvas background
            if (state.selectedElement) {
                state.selectedElement.classList.remove('selected');
                state.selectedElement = null;
                updatePropertiesPanel();
            }
        }
    });

    // Initial setup
    updatePropertiesPanel();
});
