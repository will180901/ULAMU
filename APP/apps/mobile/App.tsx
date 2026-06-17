/**
 * ULAMU — application patients (React Native).
 * Point d'entrée : zone sûre + thème (clair/sombre) + contexte d'authentification + navigation racine.
 */
import React, {useEffect} from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {RootNavigator} from './src/navigation/RootNavigator';
import {AuthProvider} from './src/state/AuthContext';
import {MeProvider} from './src/state/MeContext';
import {ThemeProvider} from './src/state/ThemeContext';
import {DialogProvider} from './src/components/Dialog';
import {checkForOtaUpdate} from './src/services/ota';

function App(): React.JSX.Element {
  // OTA (#12) : vérifie une MAJ JS au démarrage (release Android only, non bloquant, silencieux si hors-ligne).
  useEffect(() => {
    checkForOtaUpdate();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <DialogProvider>
          <AuthProvider>
            <MeProvider>
              <RootNavigator />
            </MeProvider>
          </AuthProvider>
        </DialogProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
