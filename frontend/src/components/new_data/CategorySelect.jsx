import { useState, useEffect, useRef } from 'react';

const CategorySelect = ({ cat, taskCategories, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const displayLabel = cat.category === 'Others'
        ? (cat.sub_category || 'Others')
        : (cat.category || '');

    const filteredCategories = taskCategories.filter(category =>
        category.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="position-relative" ref={dropdownRef}>
            <div
                className={`form-select d-flex justify-content-between align-items-center ${!displayLabel ? 'text-muted' : ''}`}
                style={{
                    backgroundColor: '#fff',
                    backgroundImage: 'none',
                    minHeight: '38px',
                    borderColor: isOpen ? '#065d48' : '#dee2e6',
                    boxShadow: isOpen ? '0 0 0 0.25rem rgba(6, 93, 72, 0.25)' : 'none',
                    userSelect: 'none'
                }}
                onClick={() => setIsOpen(prev => !prev)}
            >
                <span className="text-truncate me-2" style={{ color: displayLabel ? '#212529' : '#6c757d' }}>
                    {displayLabel || 'Select a category'}
                </span>
                <i className={`bi ${isOpen ? 'bi-chevron-up' : 'bi-chevron-down'} text-muted fs-085`}></i>
            </div>

            {/* Hidden input for HTML5 form required validation */}
            <input
                type="text"
                value={cat.category || ''}
                required
                tabIndex={-1}
                aria-hidden="true"
                style={{ opacity: 0, position: 'absolute', height: 0, width: 0, pointerEvents: 'none' }}
                onChange={() => { }}
            />

            {isOpen && (
                <div
                    className="dropdown-menu show shadow-lg w-100 p-2 mt-1 pointer"
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 1050,
                        borderRadius: '8px',
                        border: '1px solid #ced4da',
                        backgroundColor: '#ffffff'
                    }}
                >
                    {taskCategories.length > 5 && (
                        <div className="mb-2">
                            <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="Search category..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                            />
                        </div>
                    )}

                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {filteredCategories.map(category => {
                            const isSelected = cat.category === category.name;
                            return (
                                <div
                                    key={category.id}
                                    className={`dropdown-item rounded px-3 py-2 d-flex justify-content-between align-items-center ${isSelected ? 'active text-white' : ''}`}
                                    style={{
                                        cursor: 'pointer',
                                        backgroundColor: isSelected ? '#065d48' : undefined,
                                        fontSize: '0.9rem'
                                    }}
                                    onClick={() => {
                                        onSelect(category.name);
                                        setIsOpen(false);
                                        setSearchTerm('');
                                    }}
                                >
                                    <span>{category.name}</span>
                                    <div className="d-flex align-items-center gap-2">
                                        {category.default_time ? (
                                            <span
                                                className="badge rounded-pill"
                                                style={{
                                                    backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : 'rgba(6, 93, 72, 0.1)',
                                                    color: isSelected ? '#ffffff' : '#065d48',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600'
                                                }}
                                            >
                                                <i className="bi bi-clock me-1"></i>{category.default_time} min{category.default_time > 1 ? 's' : ''}
                                            </span>
                                        ) : null}
                                        {isSelected && <i className="bi bi-check-lg"></i>}
                                    </div>
                                </div>
                            );
                        })}

                        {filteredCategories.length === 0 && searchTerm && (
                            <div className="text-muted small px-3 py-2 text-center">
                                No matching categories
                            </div>
                        )}

                        {cat.category && !taskCategories.some(c => c.name === cat.category) && !['Meeting', 'Others'].includes(cat.category) && (
                            <div
                                className="dropdown-item rounded px-3 py-2 d-flex justify-content-between align-items-center active text-white"
                                style={{ cursor: 'pointer', backgroundColor: '#065d48', fontSize: '0.9rem' }}
                                onClick={() => {
                                    setIsOpen(false);
                                    setSearchTerm('');
                                }}
                            >
                                <span>{cat.category}</span>
                                <i className="bi bi-check-lg ms-2"></i>
                            </div>
                        )}

                        <hr className="my-1 dropdown-divider" />

                        {(!searchTerm || 'meeting'.includes(searchTerm.toLowerCase())) && (
                            <div
                                className={`pointer dropdown-item rounded px-3 py-2 d-flex justify-content-between align-items-center ${cat.category === 'Meeting' ? 'active text-white' : ''}`}
                                style={{
                                    backgroundColor: cat.category === 'Meeting' ? '#065d48' : undefined,
                                    fontSize: '0.9rem'
                                }}
                                onClick={() => {
                                    onSelect('Meeting');
                                    setIsOpen(false);
                                    setSearchTerm('');
                                }}
                            >
                                <span><i className="bi bi-people me-2"></i>Meeting</span>
                                {cat.category === 'Meeting' && <i className="bi bi-check-lg ms-2"></i>}
                            </div>
                        )}

                        {(!searchTerm || 'others'.includes(searchTerm.toLowerCase()) || (cat.sub_category && cat.sub_category.toLowerCase().includes(searchTerm.toLowerCase()))) && (
                            <div
                                className={`dropdown-item rounded px-3 py-2 d-flex justify-content-between align-items-center ${cat.category === 'Others' ? 'active text-white' : ''}`}
                                style={{
                                    cursor: 'pointer',
                                    backgroundColor: cat.category === 'Others' ? '#065d48' : undefined,
                                    fontSize: '0.9rem'
                                }}
                                onClick={() => {
                                    onSelect('Others');
                                    setIsOpen(false);
                                    setSearchTerm('');
                                }}
                            >
                                <span>
                                    <i className="bi bi-plus-circle me-2"></i>
                                    {cat.category === 'Others' && cat.sub_category ? cat.sub_category : 'Others (Custom Task...)'}
                                </span>
                                {cat.category === 'Others' && <i className="bi bi-check-lg ms-2"></i>}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CategorySelect;
