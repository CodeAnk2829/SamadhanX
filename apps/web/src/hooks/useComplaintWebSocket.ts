import React, { useCallback, useEffect } from 'react'
import { useSelector } from 'react-redux';
import useWebSocket from 'react-use-websocket';

const WS_URL ='ws://localhost:3001'

export const useComplaintWebSocket = (onComplaintUpdate: any) => {
    const {currentUser} = useSelector((state) => state.user);
    const { sendMessage, lastMessage, readyState } = useWebSocket(WS_URL, {
        shouldReconnect: () => true,
        reconnectInterval: 3000,
    });

    const getMappedRole = (role) => {
        switch (role) {
            case 'STUDENT':
            case 'FACULTY':
                return 'USER';
            case 'ISSUE_INCHARGE':
                return 'INCHARGE';
            case 'ADMIN':
                return 'ADMIN';
            default:
                console.warn('Unknown role:', role, 'Defaulting to USER');
                return 'USER';
        }
    };

    const subscribe = useCallback(() => {
        if (!currentUser?.id) {
            console.error("No user ID found, cannot subscribe to WebSocket");
            return;
        }
        const mappedRole = getMappedRole(currentUser.role);
        sendMessage(JSON.stringify({ 
            method: 'SUBSCRIBE',
            userId: currentUser.id,
            role: mappedRole,
            params: ['creation', 'deletion', 'delegation', 'escalation', 'resolution', 'updation','closure'],
        }));
    }, [sendMessage, currentUser]);

    useEffect(() =>{
        subscribe();
        return() => {
            sendMessage(JSON.stringify({
                method: 'UNSUBSCRIBE',
                userId: currentUser.id,
                role: currentUser.role,
                params: ['creation', 'deletion', 'delegation', 'escalation', 'resolution', 'updation','closure'],
            }));
        };
    }, [subscribe, sendMessage]);

    useEffect(() => {
        if (lastMessage) {
            try {
                const data = JSON.parse(lastMessage.data);
                console.log("Parsed data: ", data);
                onComplaintUpdate(data);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        }
    }, [lastMessage, onComplaintUpdate]);
}