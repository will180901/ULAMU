package com.ulamumobile

import android.os.Bundle
import android.view.WindowManager
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "UlamuMobile"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  // FLAG_SECURE app entière — données médicales visibles sur la quasi-totalité des écrans (chat,
  // carnet, ordonnance...) : bloque les captures d'écran et masque le contenu dans les apps récentes.
  //
  // Levé en DEBUG uniquement, pour pouvoir relire et faire relire l'interface en cours de conception
  // (une capture d'écran revient sinon vide, ce qui rend tout travail visuel impossible à vérifier).
  // `BuildConfig.DEBUG` est faux dans tout APK de release : la protection reste donc entière pour les
  // utilisateurs réels, sans dépendre d'une variable ou d'un geste à ne pas oublier.
  override fun onCreate(savedInstanceState: Bundle?) {
    if (!BuildConfig.DEBUG) {
      window.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE)
    }
    super.onCreate(savedInstanceState)
  }
}
