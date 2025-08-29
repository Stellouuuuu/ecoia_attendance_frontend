import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QrCode, Clock, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Html5Qrcode } from 'html5-qrcode';

interface TimeEntry {
  id: string;
  type: 'arrival' | 'departure';
  timestamp: string;
  status: 'success' | 'error';
}

const PresenceScan = () => {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const { toast } = useToast();
  const qrRef = useRef<HTMLDivElement>(null);
  const html5QrCode = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (qrRef.current && !html5QrCode.current) {
      html5QrCode.current = new Html5Qrcode('qr-reader');
      const config = { fps: 10, qrbox: 250 };
      html5QrCode.current.start(
        { facingMode: 'environment' },
        config,
        (result) => {
          if (result) {
            setScanResult(result);
            setScanError(null);
            toast({
              title: "Scan réussi",
              description: `QR Code scanné : ${result}`,
            });
            handleSubmit();
            html5QrCode.current?.stop().catch(err => console.error(err));
          }
        },
        (error) => {
          setScanError('Erreur lors de l’accès à la caméra. Vérifiez les permissions.');
        }
      ).catch(err => {
        setScanError('Impossible de démarrer la caméra. Vérifiez les permissions.');
      });

      return () => {
        if (html5QrCode.current) {
          html5QrCode.current.stop().catch(err => console.error(err));
        }
      };
    }
  }, []);

  // Simuler l'authentification et obtenir user_id
  useEffect(() => {
    const savedUserId = localStorage.getItem('user_id');
    if (!savedUserId) {
      const userId = Math.floor(Math.random() * 1000).toString();
      localStorage.setItem('user_id', userId);
    }
  }, []);

  // Soumettre le scan QR
  const handleSubmit = async () => {
    if (!scanResult) {
      toast({
        variant: "destructive",
        title: "Scan requis",
        description: "Veuillez scanner le QR Code avant de soumettre.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const userId = localStorage.getItem('user_id') || '';
      const res = await fetch('http://127.0.0.1:5000/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          token: scanResult,
        }),
      });

      const json = await res.json();

      const newEntry: TimeEntry = {
        id: Date.now().toString(),
        type: 'arrival',
        timestamp: new Date().toISOString(),
        status: res.ok ? 'success' : 'error',
      };

      setEntries(prev => [newEntry, ...prev]);

      if (res.ok) {
        toast({
          title: "Pointage enregistré",
          description: "Arrivée enregistrée avec succès !",
        });
        setScanResult(null);
      } else {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: json.message || "QR Code invalide ou erreur serveur.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de l'envoi.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-md space-y-6">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl font-bold text-primary">
              <Clock className="h-6 w-6" />
              Pointage par QR Code
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <label>Scanner le QR Code au bureau</label>
                <div className="space-y-2" id="qr-reader" ref={qrRef} style={{ width: '100%', height: '300px' }}></div>
                {scanResult && (
                  <Alert variant="success">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      QR Code scanné : {scanResult}
                    </AlertDescription>
                  </Alert>
                )}
                {scanError && (
                  <Alert variant="error">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{scanError}</AlertDescription>
                  </Alert>
                )}
              </div>

              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !scanResult}
                className="w-full text-base font-medium"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <QrCode className="mr-2 h-4 w-4" />
                    Confirmer le pointage
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {entries.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Historique récent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {entries.slice(0, 5).map((entry) => (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between rounded-lg border p-3 ${
                      entry.status === 'success'
                        ? 'border-success/20 bg-success-light'
                        : 'border-destructive/20 bg-error-light'
                    }`}
                  >
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">
                        {entry.type === 'arrival' ? 'Arrivée' : 'Départ'} •{' '}
                        {new Date(entry.timestamp).toLocaleTimeString('fr-FR')}
                      </p>
                    </div>
                    <div className="flex items-center">
                      {entry.status === 'success' ? (
                        <CheckCircle className="h-5 w-5 text-success" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PresenceScan;