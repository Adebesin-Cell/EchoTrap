'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useToast } from '@/hooks/use-toast';
import AudioVisualization from './components/audio-visualization';

export default function EchoCancellationSimulator() {
  const [isEchoCancellationOn, setIsEchoCancellationOn] = useState(true);
  const [isMicrophoneOn, setIsMicrophoneOn] = useState(false);
  const [isAudioOutputOn, setIsAudioOutputOn] = useState(false);
  const [inputAudio, setInputAudio] = useState<number[]>(Array(100).fill(0));
  const [outputAudio, setOutputAudio] = useState<number[]>(Array(100).fill(0));
  const frameRef = useRef<number>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const initAudioContext = async () => {
      try {
        audioContextRef.current = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext)();
        await audioContextRef.current.resume();

        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;

        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.gain.setValueAtTime(
          0,
          audioContextRef.current.currentTime
        );
        gainNodeRef.current.connect(audioContextRef.current.destination);
      } catch (error) {
        console.error('Error initializing audio context:', error);
      }
    };
    initAudioContext();

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    const generateAudio = () => {
      if (!analyserRef.current) return;

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteTimeDomainData(dataArray);

      const newInputAudio = Array.from(dataArray).map(
        (value) => value / 128 - 1
      );

      const newOutputAudio = isEchoCancellationOn
        ? newInputAudio.map((v) => v * 0.2)
        : newInputAudio.map((v) => v + Math.random() * 0.3);

      setInputAudio(newInputAudio);
      setOutputAudio(newOutputAudio);

      frameRef.current = requestAnimationFrame(generateAudio);
    };

    if (isMicrophoneOn) {
      frameRef.current = requestAnimationFrame(generateAudio);
    } else {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      setInputAudio(Array(100).fill(0));
      setOutputAudio(Array(100).fill(0));
    }

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [isEchoCancellationOn, isMicrophoneOn]);

  const toggleMicrophone = async () => {
    if (!audioContextRef.current) return;

    if (isMicrophoneOn) {
      if (microphoneRef.current) {
        microphoneRef.current.disconnect();
        microphoneRef.current = null;
      }
      setIsMicrophoneOn(false);
    } else {
      try {
        await audioContextRef.current.resume();
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true
        });

        microphoneRef.current =
          audioContextRef.current.createMediaStreamSource(stream);
        if (analyserRef.current) {
          microphoneRef.current.connect(analyserRef.current);
        }

        if (isAudioOutputOn && gainNodeRef.current) {
          microphoneRef.current.connect(gainNodeRef.current);
          gainNodeRef.current.connect(audioContextRef.current.destination);
        }

        setIsMicrophoneOn(true);
      } catch (error) {
        console.error('Error accessing microphone:', error);
        toast({
          title: 'Microphone Access Error',
          description:
            'Unable to access your microphone. Please check your browser settings.',
          variant: 'destructive'
        });
      }
    }
  };
  const toggleAudioOutput = () => {
    if (
      !audioContextRef.current ||
      !gainNodeRef.current ||
      !microphoneRef.current
    )
      return;

    if (isAudioOutputOn) {
      gainNodeRef.current.gain.setValueAtTime(
        0,
        audioContextRef.current.currentTime
      );
      microphoneRef.current.disconnect(gainNodeRef.current);
    } else {
      gainNodeRef.current.gain.setValueAtTime(
        isEchoCancellationOn ? 0.2 : 1,
        audioContextRef.current.currentTime
      );

      microphoneRef.current.connect(gainNodeRef.current);
      gainNodeRef.current.connect(audioContextRef.current.destination);
    }

    setIsAudioOutputOn(!isAudioOutputOn);
  };

  useEffect(() => {
    if (!audioContextRef.current || !gainNodeRef.current || !isAudioOutputOn)
      return;
    gainNodeRef.current.gain.setValueAtTime(
      isEchoCancellationOn ? 0.2 : 1,
      audioContextRef.current.currentTime
    );
  }, [isEchoCancellationOn, isAudioOutputOn]);

  return (
    <div className='container mx-auto p-4'>
      <Card className='w-full max-w-2xl mx-auto'>
        <CardHeader>
          <CardTitle>Echo Cancellation Simulator</CardTitle>
          <CardDescription>
            Toggle the switches to control echo cancellation and audio output.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex items-center justify-between mb-4'>
            <div className='flex items-center space-x-2'>
              <Switch
                id='echo-cancellation'
                checked={isEchoCancellationOn}
                onCheckedChange={setIsEchoCancellationOn}
              />
              <Label htmlFor='echo-cancellation'>Echo Cancellation</Label>
            </div>
            <div className='flex space-x-2'>
              <Button
                variant='outline'
                size='icon'
                onClick={toggleMicrophone}
                aria-label={
                  isMicrophoneOn ? 'Turn off microphone' : 'Turn on microphone'
                }
              >
                {isMicrophoneOn ? (
                  <MicOff className='h-4 w-4' />
                ) : (
                  <Mic className='h-4 w-4' />
                )}
              </Button>
              <Button
                variant='outline'
                size='icon'
                onClick={toggleAudioOutput}
                aria-label={
                  isAudioOutputOn
                    ? 'Turn off audio output'
                    : 'Turn on audio output'
                }
              >
                {isAudioOutputOn ? (
                  <Volume2 className='h-4 w-4' />
                ) : (
                  <VolumeX className='h-4 w-4' />
                )}
              </Button>
            </div>
          </div>

          <div className='space-y-4'>
            <AudioVisualization label='Input Audio' data={inputAudio} />
            <AudioVisualization label='Output Audio' data={outputAudio} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
