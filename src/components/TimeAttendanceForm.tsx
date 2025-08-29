import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Clock, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';

interface TimeEntry {
  id: string;
  firstName: string;
  lastName: string;
  type: 'arrival' | 'departure';
  timestamp: string;
  status?: 'success' | 'error';
}

const API_URL = 'https://ecoia-attendance.vercel.app/api'; 

const TimeAttendanceForm = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [entryType, setEntryType] = useState<'arrival' | 'departure'>('arrival');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const { toast } = useToast();
  const [userIp, setUserIp] = useState<string | null>(null);
  const [ipError, setIpError] = useState<string | null>(null);

  // Validation des champs nom et prénom
  const validateName = (name: string) => {
    const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]+$/;
    return nameRegex.test(name) && name.trim().length > 0;
  };

  // Récupérer l'IP publique de l'utilisateur
  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then(response => response.json())
      .then(data => setUserIp(data.ip))
      .catch(() => setIpError('Impossible de récupérer votre IP.'));
  }, []);

  // Charger les derniers pointages depuis le backend
  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const response = await axios.get(`${API_URL}/attendance/today`);
        setEntries(response.data);
      } catch (err) {
        console.error(err);
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: 'Impossible de récupérer les pointages.',
        });
      }
    };
    fetchEntries();
  }, []);

  // Soumettre le formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateName(firstName)) {
      toast({
        variant: "destructive",
        title: "Erreur de validation",
        description: "Le prénom ne doit contenir que des lettres et des espaces.",
      });
      return;
    }

    if (!validateName(lastName)) {
      toast({
        variant: "destructive",
        title: "Erreur de validation",
        description: "Le nom ne doit contenir que des lettres et des espaces.",
      });
      return;
    }

    if (!userIp) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez attendre que votre IP soit récupérée.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const ecoiaIp = '137.255.98.194';
      if (userIp !== ecoiaIp) {
        toast({
          variant: "destructive",
          title: "Connexion requise",
          description: "Vous devez vous connecter avec la connexion Wi-Fi de ECOIA.",
        });
        return;
      }

      // Envoyer au backend
      const response = await axios.post(`${API_URL}/attendance`, {
        firstName,
        lastName,
        type: entryType
      });

      setEntries(prev => [response.data, ...prev]);

      toast({
        title: "Pointage enregistré",
        description: `${entryType === 'arrival' ? 'Arrivée' : 'Départ'} enregistré(e) avec succès !`,
      });

      setFirstName('');
      setLastName('');
      setEntryType('arrival');

    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de l'enregistrement du pointage.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-md space-y-6">
        {/* Formulaire principal */}
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl font-bold text-primary">
              <Clock className="h-6 w-6" />
              Pointage d'Employé
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom *</Label>
                <Input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Votre prénom"
                  required
                  className="text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Nom *</Label>
                <Input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Votre nom"
                  required
                  className="text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="entryType">Type de pointage *</Label>
                <Select value={entryType} onValueChange={(value: 'arrival' | 'departure') => setEntryType(value)}>
                  <SelectTrigger className="text-base">
                    <SelectValue placeholder="Sélectionnez le type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="arrival">Arrivée</SelectItem>
                    <SelectItem value="departure">Départ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {ipError && (
                <Alert variant="error">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{ipError}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={isSubmitting || !firstName.trim() || !lastName.trim() || ipError !== null || !userIp}
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
                    <Clock className="mr-2 h-4 w-4" />
                    Enregistrer le pointage
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Historique des pointages */}
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
                      <p className="font-medium">
                        {entry.firstName} {entry.lastName}
                      </p>
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

export default TimeAttendanceForm;
