package com.streamflix.video.infrastructure.statemachine;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.Message;
import org.springframework.statemachine.StateContext;
import org.springframework.statemachine.StateMachine;
import org.springframework.statemachine.listener.StateMachineListenerAdapter;
import org.springframework.statemachine.state.State;
import org.springframework.statemachine.transition.Transition;
import org.springframework.stereotype.Component;

/**
 * Listener for video processing state machine events and transitions.
 * This class logs all state transitions and provides hooks for monitoring.
 */
@Component
public class VideoStateMachineListener extends StateMachineListenerAdapter<VideoProcessingState, VideoProcessingEvent> {
    
    private static final Logger logger = LoggerFactory.getLogger(VideoStateMachineListener.class);
    private final VideoProcessingStateRepository stateRepository;
    
    public VideoStateMachineListener(VideoProcessingStateRepository stateRepository) {
        this.stateRepository = stateRepository;
    }
    
    @Override
    public void stateChanged(State<VideoProcessingState, VideoProcessingEvent> from, 
                            State<VideoProcessingState, VideoProcessingEvent> to) {
        if (from != null && to != null) {
            logger.info("State changed: {} -> {}", from.getId(), to.getId());
            
            // Extract video ID from extended state variables
            StateContext<VideoProcessingState, VideoProcessingEvent> context = to.getStateMachine().getExtendedState();
            if (context.getVariables().get("videoId") != null) {
                String videoId = context.getVariables().get("videoId").toString();
                
                // Update state in database
                stateRepository.findById(java.util.UUID.fromString(videoId))
                    .ifPresent(entity -> {
                        entity.setCurrentState(to.getId());
                        stateRepository.save(entity);
                        logger.debug("Updated state in repository for video {}: {}", videoId, to.getId());
                    });
            }
        }
    }
    
    @Override
    public void transitionStarted(Transition<VideoProcessingState, VideoProcessingEvent> transition) {
        if (transition.getSource() != null && transition.getTarget() != null) {
            logger.debug("Transition started: {} -> {}", 
                    transition.getSource().getId(), 
                    transition.getTarget().getId());
        }
    }

    @Override
    public void transitionEnded(Transition<VideoProcessingState, VideoProcessingEvent> transition) {
        if (transition.getSource() != null && transition.getTarget() != null) {
            logger.debug("Transition ended: {} -> {}", 
                    transition.getSource().getId(), 
                    transition.getTarget().getId());
        }
    }
    
    @Override
    public void eventNotAccepted(Message<VideoProcessingEvent> event) {
        logger.warn("Event not accepted: {}", event.getPayload());
    }
    
    @Override
    public void stateMachineStarted(StateMachine<VideoProcessingState, VideoProcessingEvent> stateMachine) {
        logger.debug("State machine started: {}", stateMachine.getId());
    }

    @Override
    public void stateMachineStopped(StateMachine<VideoProcessingState, VideoProcessingEvent> stateMachine) {
        logger.debug("State machine stopped: {}", stateMachine.getId());
    }

    @Override
    public void stateMachineError(StateMachine<VideoProcessingState, VideoProcessingEvent> stateMachine, Exception exception) {
        logger.error("State machine error: {}", exception.getMessage(), exception);
        
        // Extract video ID and update state repository with error details
        if (stateMachine.getExtendedState().getVariables().get("videoId") != null) {
            String videoId = stateMachine.getExtendedState().getVariables().get("videoId").toString();
            stateRepository.findById(java.util.UUID.fromString(videoId))
                .ifPresent(entity -> {
                    entity.setErrorDetails(exception.getMessage());
                    stateRepository.save(entity);
                });
        }
    }
}
