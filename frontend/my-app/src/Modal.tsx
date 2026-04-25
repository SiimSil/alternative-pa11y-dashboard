import type { ReactNode } from 'react';
import './Modal.css';

type ModalProps = {
    children: ReactNode;
    onClose: () => void;
    boxClass?: string;
};

function Modal({ boxClass, children, onClose }: ModalProps) {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className={boxClass} onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>×</button>
                {children}
            </div>
        </div>
    );
}

export default Modal;