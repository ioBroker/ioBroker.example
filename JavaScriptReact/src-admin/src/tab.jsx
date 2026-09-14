import React from 'react';
import { createRoot } from 'react-dom/client';
import TabApp from './TabApp';
import '../style.css';

const container = document.getElementById('root');
if (container) {
    createRoot(container).render(<TabApp adapterName="template" />);
}
