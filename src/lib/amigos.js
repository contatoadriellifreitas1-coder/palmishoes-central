const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Cadastra um amigo depois de confirmar que o e-mail ainda não está na tabela.
 */
export async function cadastrarAmigo(supabase, dados) {
  const nome = dados?.nome?.trim();
  const email = dados?.email?.trim().toLowerCase();

  if (!nome) {
    throw new Error("O nome do amigo é obrigatório.");
  }

  if (!email || !EMAIL_PATTERN.test(email)) {
    throw new Error("Informe um e-mail válido.");
  }

  const { data: amigoExistente, error: consultaError } = await supabase
    .from("amigos")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (consultaError) {
    throw new Error(`Não foi possível validar o e-mail: ${consultaError.message}`);
  }

  if (amigoExistente) {
    throw new Error("Já existe um amigo cadastrado com este e-mail.");
  }

  const { data: amigo, error: cadastroError } = await supabase
    .from("amigos")
    .insert({ nome, email })
    .select()
    .single();

  if (cadastroError) {
    throw new Error(`Não foi possível cadastrar o amigo: ${cadastroError.message}`);
  }

  return amigo;
}
