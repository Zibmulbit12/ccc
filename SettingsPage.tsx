import React, { useState, useEffect, useRef } from 'react';
import type { Instructor, CoursePrices, CourseCategory, OperatingHours } from './index.tsx';

interface SettingsPageProps {
    instructors: Instructor[];
    setInstructors: React.Dispatch<React.SetStateAction<Instructor[]>>;
    coursePrices: CoursePrices;
    setCoursePrices: React.Dispatch<React.SetStateAction<CoursePrices>>;
    appTitle: string;
    setAppTitle: React.Dispatch<React.SetStateAction<string>>;
    operatingHours: OperatingHours;
    setOperatingHours: React.Dispatch<React.SetStateAction<OperatingHours>>;
    defaultAdvanceAmount: number;
    setDefaultAdvanceAmount: React.Dispatch<React.SetStateAction<number>>;
    onExportData: () => void;
    onImportData: (file: File) => void;
}

const SettingsPage = ({ 
    instructors, setInstructors, 
    coursePrices, setCoursePrices, 
    appTitle, setAppTitle,
    operatingHours, setOperatingHours,
    defaultAdvanceAmount, setDefaultAdvanceAmount,
    onExportData, onImportData
}: SettingsPageProps) => {
    // Local state for pending changes
    const [localAppTitle, setLocalAppTitle] = useState(appTitle);
    const [localCoursePrices, setLocalCoursePrices] = useState(coursePrices);
    const [localInstructors, setLocalInstructors] = useState(instructors);
    const [localOperatingHours, setLocalOperatingHours] = useState(operatingHours);
    const [localDefaultAdvanceAmount, setLocalDefaultAdvanceAmount] = useState(defaultAdvanceAmount);
    const [hasChanges, setHasChanges] = useState(false);

    // Local state for the "add instructor" form
    const [newInstructorName, setNewInstructorName] = useState('');
    const [newInstructorColor, setNewInstructorColor] = useState('#d32f2f');
    
    const importInputRef = useRef<HTMLInputElement>(null);

    // Effect to detect if there are any unsaved changes
    useEffect(() => {
        const titleChanged = localAppTitle !== appTitle;
        const pricesChanged = JSON.stringify(localCoursePrices) !== JSON.stringify(coursePrices);
        const instructorsChanged = JSON.stringify(localInstructors) !== JSON.stringify(instructors);
        const hoursChanged = JSON.stringify(localOperatingHours) !== JSON.stringify(operatingHours);
        const advanceChanged = localDefaultAdvanceAmount !== defaultAdvanceAmount;
        setHasChanges(titleChanged || pricesChanged || instructorsChanged || hoursChanged || advanceChanged);
    }, [localAppTitle, localCoursePrices, localInstructors, localOperatingHours, localDefaultAdvanceAmount, appTitle, coursePrices, instructors, operatingHours, defaultAdvanceAmount]);
    
    // Reset local state if props change from outside
    useEffect(() => { setLocalAppTitle(appTitle); }, [appTitle]);
    useEffect(() => { setLocalCoursePrices(coursePrices); }, [coursePrices]);
    useEffect(() => { setLocalInstructors(instructors); }, [instructors]);
    useEffect(() => { setLocalOperatingHours(operatingHours); }, [operatingHours]);
    useEffect(() => { setLocalDefaultAdvanceAmount(defaultAdvanceAmount); }, [defaultAdvanceAmount]);


    const handleAddInstructor = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newInstructorName.trim()) {
            alert('Proszę podać imię i nazwisko instruktora.');
            return;
        }
        const newInstructor: Instructor = {
            id: `inst-${Date.now()}`,
            name: newInstructorName.trim(),
            color: newInstructorColor,
        };
        setLocalInstructors(prev => [...prev, newInstructor]);
        setNewInstructorName('');
        setNewInstructorColor('#d32f2f');
    };

    const handleDeleteInstructor = (id: string) => {
        if (window.confirm('Czy na pewno chcesz usunąć tego instruktora? Zmiany zostaną zapisane po zatwierdzeniu.')) {
            setLocalInstructors(prev => prev.filter(inst => inst.id !== id));
        }
    };

    const handlePriceChange = (category: CourseCategory, value: string) => {
        setLocalCoursePrices(prevPrices => ({
            ...prevPrices,
            [category]: Number(value) || 0
        }));
    };
    
    const handleOperatingHoursChange = (part: 'start' | 'end', value: string) => {
        setLocalOperatingHours(prev => ({...prev, [part]: value}));
    };

    const handleSaveChanges = () => {
        setAppTitle(localAppTitle);
        setCoursePrices(localCoursePrices);
        setInstructors(localInstructors);
        setOperatingHours(localOperatingHours);
        setDefaultAdvanceAmount(localDefaultAdvanceAmount);
        setHasChanges(false);
    };

    const handleCancelChanges = () => {
        setLocalAppTitle(appTitle);
        setLocalCoursePrices(coursePrices);
        setLocalInstructors(instructors);
        setLocalOperatingHours(operatingHours);
        setLocalDefaultAdvanceAmount(defaultAdvanceAmount);
        setHasChanges(false);
    };
    
    const handleImportClick = () => {
        importInputRef.current?.click();
    };

    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onImportData(file);
        }
        e.target.value = '';
    };

    return (
        <div className="content-page settings-page">
            <h1>Ustawienia</h1>

            <div className="settings-section">
                <h2>Ustawienia Ogólne</h2>
                 <p className="settings-description">Zmień podstawowe informacje o swojej aplikacji.</p>
                <div className="form-group">
                    <label htmlFor="app-title">Nazwa Aplikacji</label>
                    <input
                        type="text"
                        id="app-title"
                        value={localAppTitle}
                        onChange={(e) => setLocalAppTitle(e.target.value)}
                        placeholder="Wprowadź nazwę nagłówka"
                    />
                </div>
            </div>
            
            <div className="settings-section">
                <h2>Ustawienia Operacyjne</h2>
                <p className="settings-description">Skonfiguruj domyślne wartości operacyjne, aby przyspieszyć pracę.</p>
                <div className="form-group">
                    <label>Standardowe Godziny Pracy</label>
                    <div className="form-group-double">
                        <input type="time" id="start-time" value={localOperatingHours.start} onChange={(e) => handleOperatingHoursChange('start', e.target.value)} />
                        <span>-</span>
                        <input type="time" id="end-time" value={localOperatingHours.end} onChange={(e) => handleOperatingHoursChange('end', e.target.value)} />
                    </div>
                </div>
                <div className="form-group">
                    <label htmlFor="default-advance">Domyślna Kwota Zaliczki (zł)</label>
                    <input
                        type="number"
                        id="default-advance"
                        value={localDefaultAdvanceAmount}
                        onChange={(e) => setLocalDefaultAdvanceAmount(Number(e.target.value))}
                        min="0"
                    />
                </div>
            </div>

             <div className="settings-section">
                <h2>Cennik kursów</h2>
                <p className="settings-description">Ustal ceny dla poszczególnych kategorii kursów.</p>
                <div className="price-form">
                    {(Object.keys(localCoursePrices) as CourseCategory[]).map(category => (
                        <div className="form-group" key={category}>
                            <div className="form-group-inline">
                                <label htmlFor={`price-${category}`}>Kategoria {category}</label>
                                <input
                                    type="number"
                                    id={`price-${category}`}
                                    value={localCoursePrices[category]}
                                    onChange={(e) => handlePriceChange(category, e.target.value)}
                                    placeholder="Wprowadź cenę"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="settings-section">
                <h2>Zarządzaj instruktorami</h2>
                <p className="settings-description">Dodawaj lub usuwaj instruktorów ze swojej szkoły.</p>
                <div className="instructor-management">
                    {localInstructors.length > 0 ? (
                        <ul className="instructor-management-list">
                            {localInstructors.map(instructor => (
                                <li key={instructor.id} className="instructor-management-item">
                                    <div className="instructor-management-details">
                                        <span 
                                            className="instructor-color-dot" 
                                            style={{ backgroundColor: instructor.color }}
                                        ></span>
                                        <span>{instructor.name}</span>
                                    </div>
                                    <button 
                                        className="btn-delete" 
                                        onClick={() => handleDeleteInstructor(instructor.id)}
                                        aria-label={`Usuń ${instructor.name}`}
                                    >
                                        Usuń
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="no-results-message" style={{padding: '16px 0'}}>Brak instruktorów. Dodaj nowego poniżej.</p>
                    )}

                    <form className="add-instructor-form" onSubmit={handleAddInstructor}>
                        <h3>Dodaj nowego instruktora</h3>
                        <div className="form-group">
                            <label htmlFor="new-instructor-name">Imię i nazwisko</label>
                            <input 
                                type="text"
                                id="new-instructor-name"
                                value={newInstructorName}
                                onChange={e => setNewInstructorName(e.target.value)}
                                placeholder="Jan Kowalski"
                                required
                            />
                        </div>
                         <div className="form-group">
                            <label htmlFor="new-instructor-color">Kolor</label>
                            <input 
                                type="color"
                                id="new-instructor-color"
                                value={newInstructorColor}
                                onChange={e => setNewInstructorColor(e.target.value)}
                            />
                        </div>
                        <button type="submit" className="btn-confirm">Dodaj</button>
                    </form>
                </div>
            </div>
            
            <div className="settings-section">
                <h2>Zarządzanie Danymi</h2>
                <p className="settings-description">Twórz kopie zapasowe swoich danych lub przywracaj je z pliku.</p>
                <div className="data-management-actions">
                    <button className="btn-outline" onClick={onExportData}>Eksportuj Dane</button>
                    <button className="btn-outline" onClick={handleImportClick}>Importuj Dane</button>
                    <input 
                        type="file" 
                        ref={importInputRef} 
                        style={{ display: 'none' }} 
                        accept=".json" 
                        onChange={handleFileSelected} 
                    />
                </div>
            </div>

            {hasChanges && (
                <div className="settings-actions">
                    <button className="btn-cancel" onClick={handleCancelChanges}>Anuluj</button>
                    <button className="btn-confirm" onClick={handleSaveChanges} disabled={!hasChanges}>
                        Zatwierdź zmiany
                    </button>
                </div>
            )}
        </div>
    );
};

export default SettingsPage;