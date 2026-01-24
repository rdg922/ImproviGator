/* global describe, test, expect */
import piano from './piano';
import instruments from '../../lib/instruments.json';
import { notes2midi } from '../tools';

const pianoData = instruments.piano;

describe('Piano Chords', () => {
  test('should have the correct number of chords', () => {
    const chordCount = Object.values(piano.chords).reduce(
      (acc, chords) => acc + chords.length,
      0
    );
    expect(chordCount).toBe(pianoData.numberOfChords);
  });

  describe('Test Cmaj7 midi notes', () => {
    test('Should match [ 60, 64, 67, 71 ]', () => {
      const Cmaj7 = piano.chords.C.find((chord) => chord.suffix === 'maj7');
      const midiNotes = notes2midi(Cmaj7.positions[0].frets);
      const Cmaj7Notes = [60, 64, 67, 71];
      expect(midiNotes).toEqual(Cmaj7Notes);
    });
  });

  Object.keys(piano.chords).forEach((key) => {
    describe(`Key ${key}`, () => {
      const chords = piano.chords[key];

      test('Should not have duplicated suffixes', () => {
        const seen = new Set();
        const duplicates = chords.some(
          (chord) => seen.size === seen.add(chord.suffix).size
        );
        expect(duplicates).toBe(false);
      });

      chords.forEach((chord) => {
        describe(`Chord ${chord.key}${chord.suffix}`, () => {
          test('should have a valid chord structure', () => {
            expect(chord).toBeInstanceOf(Object);

            // Valida a estrutura do acorde
            expect(chord).toHaveProperty('key', key.replace('sharp', '#'));
            expect(chord).toHaveProperty('suffix');
            expect(typeof chord.suffix).toBe('string');
            expect(chord).toHaveProperty('positions');
            expect(Array.isArray(chord.positions)).toBe(true);
            expect(chord.positions.length).toBeGreaterThan(0);

            chord.positions.forEach((position) => {
              expect(position).toHaveProperty('frets');
              expect(Array.isArray(position.frets)).toBe(true);
              expect(position.frets.length).toBeGreaterThan(0);

              // Verifica se as notas (em 'frets') são strings
              position.frets.forEach((note) => {
                expect(typeof note).toBe('string');
              });
            });
          });
        });
      });
    });
  });
});
