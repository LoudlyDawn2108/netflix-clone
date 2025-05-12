package com.streamflix.video.infrastructure.statemachine;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.statemachine.config.EnableStateMachineFactory;
import org.springframework.statemachine.config.EnumStateMachineConfigurerAdapter;
import org.springframework.statemachine.config.builders.StateMachineConfigurationConfigurer;
import org.springframework.statemachine.config.builders.StateMachineStateConfigurer;
import org.springframework.statemachine.config.builders.StateMachineTransitionConfigurer;
import org.springframework.statemachine.data.jpa.JpaPersistingStateMachineInterceptor;
import org.springframework.statemachine.data.jpa.JpaStateMachineRepository;
import org.springframework.statemachine.persist.StateMachineRuntimePersister;
import org.springframework.statemachine.service.DefaultStateMachineService;
import org.springframework.statemachine.service.StateMachineService;

import java.util.EnumSet;

/**
 * Configuration for the video processing state machine.
 * Defines states, transitions, and actions for video processing workflow.
 */
@Configuration
@EnableStateMachineFactory(name = "videoProcessingStateMachineFactory")
public class VideoStateMachineConfig extends EnumStateMachineConfigurerAdapter<VideoProcessingState, VideoProcessingEvent> {

    /**
     * Configure the state machine states, including initial and end states.
     */
    @Override
    public void configure(StateMachineStateConfigurer<VideoProcessingState, VideoProcessingEvent> states) throws Exception {
        states
            .withStates()
                .initial(VideoProcessingState.PENDING)
                .states(EnumSet.allOf(VideoProcessingState.class))
                .end(VideoProcessingState.READY)
                .end(VideoProcessingState.FAILED)
                .end(VideoProcessingState.DELETED);
    }

    /**
     * Configure state transitions based on events.
     */
    @Override
    public void configure(StateMachineTransitionConfigurer<VideoProcessingState, VideoProcessingEvent> transitions) throws Exception {
        transitions
            // From PENDING state
            .withExternal()
                .source(VideoProcessingState.PENDING)
                .target(VideoProcessingState.UPLOADED)
                .event(VideoProcessingEvent.UPLOAD_COMPLETED)
                .and()
                
            // From UPLOADED state
            .withExternal()
                .source(VideoProcessingState.UPLOADED)
                .target(VideoProcessingState.VALIDATING)
                .event(VideoProcessingEvent.START_VALIDATION)
                .and()
            .withExternal()
                .source(VideoProcessingState.UPLOADED)
                .target(VideoProcessingState.FAILED)
                .event(VideoProcessingEvent.MARK_AS_FAILED)
                .and()
                
            // From VALIDATING state
            .withExternal()
                .source(VideoProcessingState.VALIDATING)
                .target(VideoProcessingState.TRANSCODING)
                .event(VideoProcessingEvent.VALIDATION_SUCCEEDED)
                .and()
            .withExternal()
                .source(VideoProcessingState.VALIDATING)
                .target(VideoProcessingState.FAILED)
                .event(VideoProcessingEvent.VALIDATION_FAILED)
                .and()
                
            // From TRANSCODING state
            .withExternal()
                .source(VideoProcessingState.TRANSCODING)
                .target(VideoProcessingState.EXTRACTING_METADATA)
                .event(VideoProcessingEvent.TRANSCODING_SUCCEEDED)
                .and()
            .withExternal()
                .source(VideoProcessingState.TRANSCODING)
                .target(VideoProcessingState.FAILED)
                .event(VideoProcessingEvent.TRANSCODING_FAILED)
                .and()
                
            // From EXTRACTING_METADATA state
            .withExternal()
                .source(VideoProcessingState.EXTRACTING_METADATA)
                .target(VideoProcessingState.GENERATING_THUMBNAILS)
                .event(VideoProcessingEvent.METADATA_EXTRACTION_SUCCEEDED)
                .and()
            .withExternal()
                .source(VideoProcessingState.EXTRACTING_METADATA)
                .target(VideoProcessingState.FAILED)
                .event(VideoProcessingEvent.METADATA_EXTRACTION_FAILED)
                .and()
                
            // From GENERATING_THUMBNAILS state
            .withExternal()
                .source(VideoProcessingState.GENERATING_THUMBNAILS)
                .target(VideoProcessingState.READY)
                .event(VideoProcessingEvent.THUMBNAIL_GENERATION_SUCCEEDED)
                .and()
            .withExternal()
                .source(VideoProcessingState.GENERATING_THUMBNAILS)
                .target(VideoProcessingState.FAILED)
                .event(VideoProcessingEvent.THUMBNAIL_GENERATION_FAILED)
                .and()
                
            // From any state to DELETED
            .withExternal()
                .source(VideoProcessingState.PENDING)
                .target(VideoProcessingState.DELETED)
                .event(VideoProcessingEvent.DELETE)
                .and()
            .withExternal()
                .source(VideoProcessingState.UPLOADED)
                .target(VideoProcessingState.DELETED)
                .event(VideoProcessingEvent.DELETE)
                .and()
            .withExternal()
                .source(VideoProcessingState.VALIDATING)
                .target(VideoProcessingState.DELETED)
                .event(VideoProcessingEvent.DELETE)
                .and()
            .withExternal()
                .source(VideoProcessingState.TRANSCODING)
                .target(VideoProcessingState.DELETED)
                .event(VideoProcessingEvent.DELETE)
                .and()
            .withExternal()
                .source(VideoProcessingState.EXTRACTING_METADATA)
                .target(VideoProcessingState.DELETED)
                .event(VideoProcessingEvent.DELETE)
                .and()
            .withExternal()
                .source(VideoProcessingState.GENERATING_THUMBNAILS)
                .target(VideoProcessingState.DELETED)
                .event(VideoProcessingEvent.DELETE)
                .and()
            .withExternal()
                .source(VideoProcessingState.READY)
                .target(VideoProcessingState.DELETED)
                .event(VideoProcessingEvent.DELETE)
                .and()
            .withExternal()
                .source(VideoProcessingState.FAILED)
                .target(VideoProcessingState.DELETED)
                .event(VideoProcessingEvent.DELETE);
    }

    /**
     * Configure state machine persistence and monitoring
     */
    @Override
    public void configure(StateMachineConfigurationConfigurer<VideoProcessingState, VideoProcessingEvent> config) throws Exception {
        config
            .withConfiguration()
                .autoStartup(true);
    }
    
    @Bean
    public StateMachineRuntimePersister<VideoProcessingState, VideoProcessingEvent, String> stateMachineRuntimePersister(
            JpaStateMachineRepository jpaStateMachineRepository) {
        return new JpaPersistingStateMachineInterceptor<>(jpaStateMachineRepository);
    }
    
    @Bean
    public StateMachineService<VideoProcessingState, VideoProcessingEvent> stateMachineService(
            StateMachineRuntimePersister<VideoProcessingState, VideoProcessingEvent, String> stateMachineRuntimePersister) {
        return new DefaultStateMachineService<>(stateMachineRuntimePersister);
    }
}
